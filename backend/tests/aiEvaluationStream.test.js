import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createAiEvaluationStreamRouter } from '../src/modules/ai-evaluations/aiEvaluationStreamRoutes.js'
import { createAiUsageRouter } from '../src/modules/ai-evaluations/aiUsageRoutes.js'

const id = '11111111-1111-4111-8111-111111111111'
const origin = 'http://localhost:5173'
const result = { submission_id: id, submission_status: 'REQUIRES_REVIEW', evaluation: { id: 'saved' } }
const path = `/api/submissions/${id}/ai-evaluation/stream`
function build({ role = 'TEACHER', runEvaluation = async () => result, aiUsageService } = {}) {
  const authenticate = (req, _res, next) => {
    if (!role) return next(new AppError(401, 'INVALID_SESSION', 'Phiên hết hạn.'))
    req.auth = { profile: { id: 'teacher', role, status: 'ACTIVE' } }
    next()
  }
  return createApp({ logger: { error() {} }, registerRoutes(app) {
    app.use('/api', createAiEvaluationStreamRouter({ authenticate, aiEvaluationService: { runEvaluation } }))
    app.use('/api/admin', createAiUsageRouter({ authenticate, aiUsageService }))
  } })
}
function post(app, route = path) { return request(app).post(route).set('Origin', origin) }

test('stream only forwards confirmed stages for this submission and completes after run resolves', async () => {
  const response = await post(build({ async runEvaluation(auth, submissionId, { onProgress }) {
    assert.equal(auth.profile.role, 'TEACHER')
    assert.equal(submissionId, id)
    for (const stage of ['input_ready', 'transcribed', 'evaluated', 'checked', 'persisted']) {
      onProgress({ stage, submissionId, token: 'private', studentName: 'private' })
    }
    onProgress({ stage: 'checked', submissionId })
    onProgress({ stage: 'fake', submissionId })
    onProgress({ stage: 'checked', submissionId: 'other' })
    return result
  } }))
  assert.equal(response.status, 200)
  assert.match(response.headers['content-type'], /text\/event-stream/)
  assert.equal((response.text.match(/event: stage/g) ?? []).length, 5)
  assert.ok(response.text.indexOf('"stage":"persisted"') < response.text.indexOf('event: complete'))
  assert.doesNotMatch(response.text, /private|fake|other/)
  assert.match(response.text, new RegExp(`data: ${JSON.stringify(result)}\n`))
})

test('baseline service without callbacks emits no invented stages', async () => {
  const response = await post(build())
  assert.match(response.text, /event: complete/)
  assert.doesNotMatch(response.text, /event: stage/)
})

test('stream validates IDs and rejects expired sessions and wrong roles before service use', async () => {
  for (const [role, status] of [[null, 401], ['STUDENT', 403], ['ADMIN', 403]]) {
    const response = await post(build({ role, runEvaluation() { assert.fail('must not run') } }))
    assert.equal(response.status, status)
  }
  const response = await post(build(), '/api/submissions/bad/ai-evaluation/stream')
  assert.equal(response.status, 400)
})

test('ownership and finalized errors retain HTTP semantics before streaming', async () => {
  for (const status of [403, 404, 409]) {
    const response = await post(build({ runEvaluation() { throw new AppError(status, 'SAFE', 'Không được phép.') } }))
    assert.equal(response.status, status)
    assert.doesNotMatch(response.text, /event: complete/)
  }
})

test('errors after a stage never emit complete or leak internal details', async () => {
  const response = await post(build({ runEvaluation(_auth, submissionId, { onProgress }) {
    onProgress({ stage: 'evaluated', submissionId })
    throw new Error('secret provider detail')
  } }))
  assert.match(response.text, /event: error/)
  assert.doesNotMatch(response.text, /event: complete|secret provider detail/)
})

test('incomplete persistence cannot become stream success', async () => {
  const response = await post(build({ runEvaluation: async () => ({ ...result, submission_status: 'PROCESSING' }) }))
  assert.equal(response.status, 500)
  assert.equal(response.body.error.code, 'AI_EVALUATION_INCOMPLETE')
})

test('disconnect keeps run locked, drops late events, and releases lock after completion', async () => {
  let finish
  let started
  let calls = 0
  const start = new Promise((resolve) => { started = resolve })
  const app = build({ async runEvaluation(_auth, submissionId, { onProgress }) {
    calls += 1
    if (calls > 1) return result
    onProgress({ stage: 'input_ready', submissionId })
    started()
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
    await start
    assert.equal(first.status, 200)
    controller.abort()
    const duplicate = await fetch(url, { method: 'POST', headers: { Origin: origin } })
    assert.equal(duplicate.status, 409)
    assert.equal((await duplicate.json()).error.code, 'AI_EVALUATION_RUNNING')
    finish()
    await new Promise((resolve) => setImmediate(resolve))
    const released = await fetch(url, { method: 'POST', headers: { Origin: origin } })
    assert.equal(released.status, 200)
    assert.match(await released.text(), /event: complete/)
    assert.equal(calls, 2)
  } finally {
    finish?.()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

test('AI usage is Admin-only and unavailable data is not reported as zero', async () => {
  for (const role of ['TEACHER', 'STUDENT']) {
    assert.equal((await request(build({ role })).get('/api/admin/ai-usage')).status, 403)
  }
  assert.equal((await request(build({ role: null })).get('/api/admin/ai-usage')).status, 401)
  const unavailable = await request(build({ role: 'ADMIN' })).get('/api/admin/ai-usage')
  assert.equal(unavailable.status, 503)
  assert.equal(unavailable.body.error.code, 'AI_USAGE_UNAVAILABLE')
  const data = { total_calls: 12, failed_calls: 2, refused_calls: 1, avg_latency_ms: 1300,
    avg_cost_usd: null, priced_calls: 0, unpriced_calls: 12 }
  const response = await request(build({ role: 'ADMIN', aiUsageService: {
    async getSummary(auth) { assert.equal(auth.profile.role, 'ADMIN'); return data },
  } })).get('/api/admin/ai-usage')
  assert.deepEqual(response.body.data, data)
})
