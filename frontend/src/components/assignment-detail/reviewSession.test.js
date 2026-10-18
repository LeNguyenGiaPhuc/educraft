import assert from 'node:assert/strict'
import test from 'node:test'
import { createReviewSession } from './reviewSession.js'

const submission = { id: 'attempt-1', status: 'submitted', feedback: '' }
const evaluation = { suggested_status: 'COMPLETED', feedback_draft: 'AI nháp' }
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }

test('stream reports matching stages, deduplicates clicks and preserves manual fields', async () => {
  const session = createReviewSession('stream')
  const item = { ...submission, id: 'stream-double-click' }
  session.ensure(item)
  const pending = deferred()
  let posts = 0
  const run = session.runEvaluation(item.id, (id, { onProgress }) => {
    posts++
    onProgress({ stage: 'transcribed', submissionId: id })
    onProgress({ stage: 'checked', submissionId: 'other' })
    onProgress({ stage: 'fake', submissionId: id })
    return pending.promise
  })
  await session.runEvaluation(item.id, () => { posts++ })
  assert.equal(posts, 1)
  assert.equal(session.get(item.id).evaluation.stage, 'transcribed')
  session.change(item.id, 'finalStatus', 'NEEDS_COMPLETION')
  session.change(item.id, 'feedback', '')
  pending.resolve(evaluation); await run
  assert.deepEqual(session.get(item.id).form, { finalStatus: 'NEEDS_COMPLETION', feedback: '' })
})

test('switching submission aborts stream, ignores late result and keeps independent drafts', async () => {
  const session = createReviewSession('cancel')
  const item = { ...submission, id: 'stream-cancel' }
  session.ensure(item); session.change(item.id, 'feedback', 'Nháp cũ')
  let signal
  const pending = deferred()
  const run = session.runEvaluation(item.id, (_id, options) => { signal = options.signal; return pending.promise })
  session.cancelEvaluation(item.id)
  assert.equal(signal.aborted, true)
  session.ensure({ ...item, id: 'next' }); session.change('next', 'feedback', 'Nháp mới')
  pending.resolve(evaluation); await run
  assert.equal(session.get(item.id).evaluation.status, 'interrupted')
  assert.equal(session.get('next').form.feedback, 'Nháp mới')
  await session.loadEvaluation(item.id, async () => evaluation)
  assert.equal(session.get(item.id).evaluation.status, 'success')
  assert.equal(session.get(item.id).form.feedback, 'Nháp cũ')
})

test('interruption never auto-reposts; a subsequent GET 404 unlocks an explicit retry across remounts', async () => {
  const item = { ...submission, id: 'stream-interrupted' }
  const session = createReviewSession('reconnect'); session.ensure(item)
  let gets = 0
  await session.runEvaluation(item.id, async () => { throw Object.assign(new Error('Mất mạng'), { code: 'AI_STREAM_INTERRUPTED' }) },
    { async getEvaluation() { gets++; throw { status: 404 } } })
  assert.equal(gets, 1)
  assert.equal(session.get(item.id).evaluation.status, 'interrupted')
  const reopened = createReviewSession('reconnect'); reopened.ensure(item)
  await reopened.loadEvaluation(item.id, async () => { throw { status: 503 } })
  assert.equal(reopened.get(item.id).evaluation.status, 'interrupted')
  let posts = 0
  await reopened.runEvaluation(item.id, () => { posts++ })
  assert.equal(posts, 0)
  await reopened.loadEvaluation(item.id, async () => { throw { status: 404 } })
  assert.equal(reopened.get(item.id).evaluation.status, 'not-started')
  assert.equal(posts, 0)
  reopened.change(item.id, 'feedback', 'Giữ nguyên nhận xét thủ công')
  await reopened.runEvaluation(item.id, async () => { posts++; return evaluation })
  assert.equal(posts, 1)
  assert.equal(reopened.get(item.id).evaluation.status, 'success')
  assert.equal(reopened.get(item.id).form.feedback, 'Giữ nguyên nhận xét thủ công')
})

test('retry while backend still runs stays recoverable, then succeeds after the failed run ends', async () => {
  const item = { ...submission, id: 'stream-retry-running' }
  const session = createReviewSession('retry-running'); session.ensure(item)
  let posts = 0
  const missing = async () => { throw { status: 404, code: 'AI_EVALUATION_NOT_FOUND' } }
  const request = async () => {
    posts++
    if (posts === 1) throw { code: 'AI_STREAM_INTERRUPTED' }
    if (posts === 2) throw { code: 'AI_EVALUATION_RUNNING' }
    return evaluation
  }
  await session.runEvaluation(item.id, request, { getEvaluation: missing })
  assert.equal(posts, 1)
  assert.equal(session.get(item.id).evaluation.status, 'interrupted')
  await session.loadEvaluation(item.id, missing)
  assert.equal(session.get(item.id).evaluation.status, 'not-started')
  await session.runEvaluation(item.id, request, { getEvaluation: missing })
  assert.equal(posts, 2)
  assert.equal(session.get(item.id).evaluation.status, 'interrupted')
  await session.loadEvaluation(item.id, async () => null)
  assert.equal(session.get(item.id).evaluation.status, 'empty')
  await session.runEvaluation(item.id, request, { getEvaluation: missing })
  assert.equal(posts, 3)
  assert.equal(session.get(item.id).evaluation.status, 'success')
})

test('AI error keeps manual finalization available', async () => {
  const session = createReviewSession('failed-stream')
  const item = { ...submission, id: 'stream-failed' }; session.ensure(item)
  await session.runEvaluation(item.id, async () => { throw new Error('AI không khả dụng') })
  assert.equal(session.get(item.id).evaluation.status, 'error')
  session.change(item.id, 'feedback', 'Giáo viên xem ảnh và chốt thủ công')
  await session.finalize(item.id, async () => ({ id: item.id }))
  assert.equal(session.get(item.id).finalized, true)
})

test('workspace receives confirmed finalization for original ID while another attempt preserves its draft', async () => {
  const session = createReviewSession('A')
  session.ensure(submission)
  session.change(submission.id, 'feedback', 'Đã kiểm tra')
  const pending = deferred()
  const saving = session.finalize(submission.id, () => pending.promise)
  const other = { ...submission, id: 'attempt-2' }
  session.ensure(other)
  session.change(other.id, 'feedback', 'Nhận xét chưa lưu của lượt 2')
  let notifications = 0
  const unsubscribe = session.subscribeWorkspace(() => { notifications++ })
  pending.resolve({ id: submission.id })
  await saving
  assert.equal(session.get(submission.id).finalized, true)
  assert.equal(session.get(other.id).form.feedback, 'Nhận xét chưa lưu của lượt 2')
  assert.equal(notifications, 1)
  assert.ok(session.getRevision() > 0)
  unsubscribe()
  session.change(other.id, 'feedback', 'Tiếp tục nhập')
  assert.equal(notifications, 1)
})

test('AI cannot overwrite manually selected status or feedback emptied by teacher', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission)
  const pending = deferred()
  const request = session.loadEvaluation(submission.id, () => pending.promise)
  session.change(submission.id, 'finalStatus', 'NEEDS_COMPLETION')
  session.change(submission.id, 'feedback', '')
  pending.resolve(evaluation)
  await request
  assert.deepEqual(session.get(submission.id).form, { finalStatus: 'NEEDS_COMPLETION', feedback: '' })
})

test('untouched fields use AI suggestion, independent attempts preserve their drafts', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission)
  await session.loadEvaluation(submission.id, async () => evaluation)
  assert.equal(session.get(submission.id).form.finalStatus, 'COMPLETED')
  assert.equal(session.get(submission.id).finalized, false)
  session.change(submission.id, 'feedback', 'Nhận xét riêng')
  session.ensure({ ...submission, id: 'attempt-2' })
  session.change('attempt-2', 'feedback', 'Lần hai')
  session.ensure(submission)
  assert.equal(session.get(submission.id).form.feedback, 'Nhận xét riêng')
  assert.equal(session.get('attempt-2').form.feedback, 'Lần hai')
})

test('late AI response remains on original ID and does not change another assignment session', async () => {
  const session = createReviewSession('assignment-1')
  const next = createReviewSession('assignment-2')
  session.ensure(submission); next.ensure(submission)
  const pending = deferred()
  const request = session.loadEvaluation(submission.id, () => pending.promise)
  session.ensure({ ...submission, id: 'attempt-2' })
  pending.resolve(evaluation); await request
  assert.equal(session.get('attempt-2').evaluation.status, 'idle')
  assert.equal(next.get(submission.id).evaluation.status, 'idle')
})

test('finalization has synchronous duplicate lock, validation and server-confirmed seal only', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission)
  let calls = 0
  await session.finalize(submission.id, async () => { calls += 1 })
  assert.equal(calls, 0)
  assert.equal(session.get(submission.id).errors.feedback, 'Nhập nhận xét cho học sinh.')
  session.change(submission.id, 'feedback', 'Giáo viên chốt')
  const pending = deferred()
  const request = session.finalize(submission.id, () => { calls += 1; return pending.promise })
  await session.finalize(submission.id, () => { calls += 1 })
  assert.equal(calls, 1)
  assert.equal(session.get(submission.id).finalized, false)
  pending.resolve({ id: submission.id }); await request
  assert.equal(session.get(submission.id).finalized, true)
  session.change(submission.id, 'feedback', 'Không được đổi')
  assert.equal(session.get(submission.id).form.feedback, 'Giáo viên chốt')
})

test('finalize error unlocks retry, successful save stays finalized even if list refresh fails', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission); session.change(submission.id, 'feedback', 'Nhận xét')
  await session.finalize(submission.id, async () => { throw new Error('Lỗi mạng') })
  assert.equal(session.get(submission.id).review.status, 'error')
  const result = await session.finalize(submission.id, async () => ({ id: submission.id }))
  assert.equal(result.id, submission.id)
  session.refreshFailed(submission.id)
  assert.equal(session.get(submission.id).finalized, true)
  assert.equal(session.get(submission.id).review.status, 'success')
})

test('GET 404 is not-requested; only explicit POST retries and finalized attempt cannot POST', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission)
  await session.loadEvaluation(submission.id, async () => { throw { status: 404 } })
  assert.equal(session.get(submission.id).evaluation.status, 'not-started')
  await session.runEvaluation(submission.id, async () => { throw new Error('Không thể phân tích') })
  assert.equal(session.get(submission.id).evaluation.status, 'error')
  await session.runEvaluation(submission.id, async () => evaluation)
  assert.equal(session.get(submission.id).evaluation.status, 'success')
  session.ensure({ ...submission, id: 'approved', status: 'approved' })
  let calls = 0
  await session.runEvaluation('approved', async () => { calls += 1 })
  assert.equal(calls, 0)
})

test('AI completing during finalize does not alter snapshot being saved', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission); session.change(submission.id, 'feedback', 'Tay nhập')
  const ai = deferred(); const save = deferred()
  const aiRequest = session.runEvaluation(submission.id, () => ai.promise)
  let payload
  const saveRequest = session.finalize(submission.id, (_id, input) => { payload = input; return save.promise })
  ai.resolve(evaluation); await aiRequest
  assert.equal(session.get(submission.id).form.finalStatus, 'NEEDS_COMPLETION')
  assert.equal(payload.feedback, 'Tay nhập')
  save.resolve({}); await saveRequest
})

test('selected GET is deduplicated while pending and when returning to visited attempt', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission)
  let calls = 0
  const pending = deferred()
  const request = session.loadEvaluation(submission.id, () => { calls += 1; return pending.promise })
  await session.loadEvaluation(submission.id, () => { calls += 1 })
  assert.equal(calls, 1)
  pending.resolve(evaluation); await request
  session.ensure({ ...submission, id: 'attempt-2' }); session.ensure(submission)
  await session.loadEvaluation(submission.id, () => { calls += 1 })
  assert.equal(calls, 1)
})

test('empty server AI response is distinct, and GET persisted finalization reconciles lock', async () => {
  const session = createReviewSession('assignment-1')
  session.ensure(submission)
  await session.loadEvaluation(submission.id, async () => null)
  assert.equal(session.get(submission.id).evaluation.status, 'empty')
  session.syncSubmission({ ...submission, status: 'approved', finalStatus: 'COMPLETED', feedback: 'Server đã chốt' })
  assert.equal(session.get(submission.id).finalized, true)
  assert.equal(session.get(submission.id).form.feedback, 'Server đã chốt')
})
