import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createAiEvaluationController } from '../src/modules/ai-evaluations/aiEvaluationController.js'
import { createAiEvaluationRouter } from '../src/modules/ai-evaluations/aiEvaluationRoutes.js'
import { createAiEvaluationStreamRouter } from '../src/modules/ai-evaluations/aiEvaluationStreamRoutes.js'
import { createAiEvaluationService } from '../src/modules/ai-evaluations/aiEvaluationService.js'

const id = '11111111-1111-4111-8111-111111111111'
const origin = 'http://localhost:5173'
const path = `/api/submissions/${id}/ai-evaluation/stream`
const result = { submission_id: id, submission_status: 'REQUIRES_REVIEW', evaluation: { id: 'saved' } }
function build({ role = 'TEACHER', run = async () => result, authorizeSubmission } = {}) {
  const authenticate = (req, _res, next) => {
    if (!role) return next(new AppError(401, 'INVALID_SESSION', 'Phiên hết hạn.'))
    req.auth = { profile: { id: 'teacher', role, status: 'ACTIVE' } }
    next()
  }
  const service = { async runEvaluation(auth, submissionId, options = {}) {
    await authorizeSubmission?.(auth, submissionId)
    await options.onAuthorized?.()
    return run(auth, submissionId, options)
  }, getEvaluation: async () => result.evaluation }
  return createApp({ logger: { error() {} }, registerRoutes(app) {
    app.use('/api', createAiEvaluationRouter({ authenticate, controller: createAiEvaluationController({ aiEvaluationService: service }) }))
    app.use('/api', createAiEvaluationStreamRouter({ authenticate, aiEvaluationService: service }))
  } })
}
const post = (app, url = path) => request(app).post(url).set('Origin', origin)

test('stream forwards confirmed stages for this ID, drops private fields, and preserves JSON API', async () => {
  const app = build({ async run(auth, submissionId, { onProgress } = {}) {
    assert.equal(auth.profile.role, 'TEACHER')
    assert.equal(submissionId, id)
    for (const stage of ['input_ready', 'transcribed', 'evaluated', 'checked', 'persisted']) {
      onProgress?.({ stage, submissionId, private: 'secret' })
    }
    onProgress?.({ stage: 'checked', submissionId })
    onProgress?.({ stage: 'fake', submissionId })
    onProgress?.({ stage: 'checked', submissionId: 'other' })
    return result
  } })
  const response = await post(app)
  assert.equal(response.status, 200)
  assert.match(response.headers['content-type'], /text\/event-stream/)
  assert.equal((response.text.match(/event: stage/g) ?? []).length, 5)
  assert.doesNotMatch(response.text, /secret|fake|other/)
  assert.ok(response.text.indexOf('"stage":"persisted"') < response.text.indexOf('event: complete'))
  assert.deepEqual((await post(app, `/api/submissions/${id}/ai-evaluation`)).body.data, result)
  assert.deepEqual((await request(app).get(`/api/submissions/${id}/ai-evaluation`)).body.data, result.evaluation)
})

test('stream enforces role, session, UUID and ownership before service execution', async () => {
  for (const [role, status] of [[null, 401], ['STUDENT', 403], ['ADMIN', 403]]) {
    assert.equal((await post(build({ role, run() { assert.fail('must not run') } }))).status, status)
  }
  assert.equal((await post(build(), '/api/submissions/bad/ai-evaluation/stream')).status, 400)
  const denied = await post(build({ authorizeSubmission() { throw new AppError(403, 'FORBIDDEN', 'Không có quyền.') },
    run() { assert.fail('must not run') } }))
  assert.equal(denied.status, 403)
})

test('service without progress does not invent stages; incomplete state never completes', async () => {
  const response = await post(build())
  assert.match(response.text, /event: complete/)
  assert.doesNotMatch(response.text, /event: stage/)
  for (const value of [{ ...result, submission_status: 'PROCESSING' }, { ...result, evaluation: null }]) {
    const incomplete = await post(build({ run: async () => value }))
    assert.equal(incomplete.status, 500)
    assert.doesNotMatch(incomplete.text, /event: complete/)
  }
})

test('errors retain HTTP semantics before streaming and safe error events afterwards', async () => {
  for (const status of [403, 404, 409]) {
    assert.equal((await post(build({ run() { throw new AppError(status, 'SAFE', 'Không được phép.') } }))).status, status)
  }
  const failed = await post(build({ run(_auth, submissionId, { onProgress }) {
    onProgress({ stage: 'evaluated', submissionId })
    throw new Error('private provider details')
  } }))
  assert.match(failed.text, /event: error/)
  assert.doesNotMatch(failed.text, /event: complete|private provider details/)
})

test('failed run releases the backend lock so an explicit retry can complete', async () => {
  let calls = 0
  const app = build({ run(_auth, submissionId, { onProgress }) {
    calls++
    onProgress({ stage: 'input_ready', submissionId })
    if (calls === 1) throw new Error('provider failed before saving')
    return result
  } })
  assert.match((await post(app)).text, /event: error/)
  assert.match((await post(app)).text, /event: complete/)
  assert.equal(calls, 2)
})

test('disconnect retains duplicate lock until service finishes; unauthorized requests cannot inspect it', async () => {
  let finish, calls = 0, allowed = true
  const app = build({ authorizeSubmission() { if (!allowed) throw new AppError(403, 'FORBIDDEN', 'Không có quyền.') },
    async run(_auth, submissionId, { onProgress }) {
      calls++
      if (calls > 1) return result
      onProgress({ stage: 'input_ready', submissionId })
      await new Promise((resolve) => { finish = resolve })
      onProgress({ stage: 'persisted', submissionId })
      return result
    } })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}${path}`
  const controller = new AbortController()
  try {
    const first = await fetch(url, { method: 'POST', headers: { Origin: origin }, signal: controller.signal })
    assert.equal(first.status, 200)
    controller.abort()
    allowed = false
    assert.equal((await fetch(url, { method: 'POST', headers: { Origin: origin } })).status, 403)
    allowed = true
    const duplicate = await fetch(url, { method: 'POST', headers: { Origin: origin } })
    assert.equal(duplicate.status, 409)
    assert.equal((await duplicate.json()).error.code, 'AI_EVALUATION_RUNNING')
    // A rejected retry must not release the first request's lock.
    assert.equal((await fetch(url, { method: 'POST', headers: { Origin: origin } })).status, 409)
    assert.equal(calls, 1)
    finish()
    await new Promise((resolve) => setImmediate(resolve))
    const released = await fetch(url, { method: 'POST', headers: { Origin: origin } })
    assert.match(await released.text(), /event: complete/)
    assert.equal(calls, 2)
  } finally {
    finish?.()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

function pipeline({ failSave = false, failStatus = false, failChecker = false } = {}) {
  const events = []
  let status = 'SUBMITTED', saved
  const adminClient = { from() {
    let value
    const query = {
      update(input) { value = input; return query }, upsert(input) { value = input; return query },
      select() { return query }, eq() { return query }, neq() { return query },
      async maybeSingle() {
        if (failStatus && value.status === 'REQUIRES_REVIEW') return { error: { code: 'TEST' } }
        status = value.status; events.push(status)
        return { data: { id, status }, error: null }
      },
      async single() {
        if (failSave) return { error: { code: 'TEST' } }
        saved = { id: 'saved', ...value }; events.push('saved')
        return { data: saved, error: null }
      },
    }
    return query
  } }
  const supabase = { from() {
    const query = { select() { return query }, eq() { return query }, async maybeSingle() { return { data: saved ?? null } } }
    return query
  } }
  const service = createAiEvaluationService({ adminClient,
    assignmentService: { async getAssignment() { return { coverage_threshold: 80 } } },
    submissionService: { async getSubmission() { events.push('authorized'); return { id, status, assignment_id: 'assignment' } } },
    inputService: { async loadEvaluationInput() { return {} } },
    provider: {
      async evaluate(_input, { onProgress }) {
        await onProgress('transcribed'); await onProgress('evaluated')
        return { coverage_score: 90, confidence: 0.9, suggested_status: 'COMPLETED', missing_content: [],
          feedback_draft: 'Nội dung phù hợp', reference_transcription: 'Bài mẫu', student_transcription: 'Bài nộp',
          uncertain_content: [], provider: 'ollama', model_name: 'test', model_version: 'test', prompt_version: 'test', latency_ms: 1 }
      },
      async check() {
        if (failChecker) throw new Error('checker failure')
        return { status: 'PASSED', summary: 'Có bằng chứng', findings: [] }
      },
    },
    usageRecorder: { async record() { events.push('usage-recorded') } }, logger: { error() {} },
  })
  const authenticate = (req, _res, next) => { req.auth = { profile: { id: 'teacher', role: 'TEACHER' }, supabase }; next() }
  const app = createApp({ logger: { error() {} }, registerRoutes(app) {
    app.use('/api', createAiEvaluationStreamRouter({ authenticate, aiEvaluationService: service }))
  } })
  return { app, events }
}

test('real member 2 pipeline completes after saved evaluation, review status and usage recording', async () => {
  const { app, events } = pipeline()
  const response = await post(app)
  const blocks = response.text.trim().split('\n\n')
  assert.deepEqual(blocks.filter((block) => block.startsWith('event: stage'))
    .map((block) => JSON.parse(block.split('data: ')[1]).stage),
  ['input_ready', 'transcribed', 'evaluated', 'checked', 'persisted'])
  assert.ok(blocks.at(-1).startsWith('event: complete'))
  assert.deepEqual(events, ['authorized', 'PROCESSING', 'saved', 'REQUIRES_REVIEW', 'usage-recorded'])
  assert.equal(JSON.parse(blocks.at(-1).split('data: ')[1]).evaluation.checker_status, 'PASSED')
})

test('checker failure omits checked; persistence and status failures cannot complete', async () => {
  const unchecked = await post(pipeline({ failChecker: true }).app)
  assert.doesNotMatch(unchecked.text, /"stage":"checked"/)
  assert.match(unchecked.text, /event: complete/)
  for (const options of [{ failSave: true }, { failStatus: true }]) {
    const failed = await post(pipeline(options).app)
    assert.match(failed.text, /event: error/)
    assert.doesNotMatch(failed.text, /event: complete/)
  }
})
