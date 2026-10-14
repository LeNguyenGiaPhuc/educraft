import assert from 'node:assert/strict'
import test from 'node:test'
import { createReviewSession } from './reviewSession.js'

const submission = { id: 'attempt-1', status: 'submitted', feedback: '' }
const evaluation = { suggested_status: 'COMPLETED', feedback_draft: 'AI nháp' }
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }

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
