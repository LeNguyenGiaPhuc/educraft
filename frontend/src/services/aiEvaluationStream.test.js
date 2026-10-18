import assert from 'node:assert/strict'
import test from 'node:test'
import { createAiEvaluationService } from './aiEvaluationService.js'

const id = 'submission-1'
const complete = { submission_id: id, submission_status: 'REQUIRES_REVIEW', evaluation: { feedback_draft: 'Đã đọc ảnh' } }
const event = (name, data) => `event: ${name}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`
function stream(text) {
  const bytes = new TextEncoder().encode(text)
  let offset = 0
  return new Response(new ReadableStream({ pull(controller) {
    if (offset === bytes.length) { controller.close(); return }
    controller.enqueue(bytes.slice(offset, offset += 3))
  } }), { headers: { 'Content-Type': 'text/event-stream' } })
}

test('stream uses session cookies and safely parses split CRLF and Vietnamese UTF-8', async () => {
  const progress = []
  const service = createAiEvaluationService({ baseUrl: 'http://localhost:3000/', fetchImpl: async (url, options) => {
    assert.equal(url, 'http://localhost:3000/api/submissions/submission-1/ai-evaluation/stream')
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'include')
    return stream(event('stage', { submissionId: id, stage: 'transcribed', private: true })
      + event('stage', { submissionId: 'other', stage: 'checked' })
      + event('stage', { submissionId: id, stage: 'fake' }) + event('complete', complete))
  } })
  assert.deepEqual(await service.streamEvaluation(id, { onProgress: (data) => progress.push(data) }), complete)
  assert.deepEqual(progress, [{ submissionId: id, stage: 'transcribed' }])
})

test('only unsupported endpoint falls back to JSON; network or service failures never repeat POST', async () => {
  let posts = 0
  const api = { post: async () => { posts++; return complete } }
  const missing = createAiEvaluationService({ api, fetchImpl: async () => Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 }) })
  assert.deepEqual(await missing.streamEvaluation(id), complete)
  for (const status of [401, 403, 404, 409, 500]) {
    const service = createAiEvaluationService({ api, fetchImpl: async () => Response.json({ error: { code: 'SERVICE_ERROR' } }, { status }) })
    await assert.rejects(service.streamEvaluation(id), (error) => error.status === status)
  }
  const offline = createAiEvaluationService({ api, fetchImpl: async () => { throw new Error('offline') } })
  await assert.rejects(offline.streamEvaluation(id), { code: 'AI_STREAM_INTERRUPTED' })
  assert.equal(posts, 1)
})

test('truncated, malformed and mismatched completions never become success', async () => {
  for (const text of [event('stage', { submissionId: id, stage: 'evaluated' }),
    'event: complete\ndata: {broken}\n\n', event('complete', { ...complete, submission_id: 'other' }),
    event('complete', { ...complete, submission_status: 'PROCESSING' }), event('complete', null)]) {
    const service = createAiEvaluationService({ fetchImpl: async () => stream(text) })
    await assert.rejects(service.streamEvaluation(id), { code: 'AI_STREAM_INTERRUPTED' })
  }
  const failed = createAiEvaluationService({ fetchImpl: async () => stream(event('error', { code: 'SAVE_FAILED', message: 'Không thể lưu' })) })
  await assert.rejects(failed.streamEvaluation(id), { code: 'SAVE_FAILED' })
})

test('abort cancels a pending stream reader without sending another POST', async () => {
  let canceled = false, ready
  const reading = new Promise((resolve) => { ready = resolve })
  const controller = new AbortController()
  const service = createAiEvaluationService({ fetchImpl: async () => new Response(new ReadableStream({
    pull() { ready() }, cancel() { canceled = true },
  }), { headers: { 'Content-Type': 'text/event-stream' } }) })
  const run = service.streamEvaluation(id, { signal: controller.signal })
  await reading; controller.abort()
  await assert.rejects(run, { name: 'AbortError' })
  assert.equal(canceled, true)
})
