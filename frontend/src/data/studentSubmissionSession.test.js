import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createStudentSubmissionSession } from './studentSubmissionSession.js'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const row = (id, attempt = 1) => ({ id, assignment_id: 'a', attempt_number: attempt, status: 'SUBMITTED', submitted_at: '2026-10-14T10:00:00Z', files: [{ original_filename: `${id}.png`, size_bytes: 50 }] })

test('late history GET merges the confirmed POST without dropping previous attempts or duplicating ID', async () => {
  const get = deferred(), post = deferred()
  const session = createStudentSubmissionSession('a', { listMySubmissions: () => get.promise, createSubmission: () => post.promise })
  const loading = session.loadHistory()
  const sending = session.submit({ file: {}, fileName: 'new.png' })
  post.resolve(row('new', 2)); await sending
  assert.deepEqual(session.getSnapshot().history.data.map(item => item.id), ['new'])
  assert.equal(session.getSnapshot().history.status, 'loading')
  get.resolve([row('old')]); await loading
  assert.deepEqual(session.getSnapshot().history.data.map(item => item.id), ['old', 'new'])
  assert.equal(session.getSnapshot().submit.status, 'success')
})

test('a GET containing the confirmed ID does not duplicate it and retains server feedback', async () => {
  const get = deferred()
  const session = createStudentSubmissionSession('a', { listMySubmissions: () => get.promise, createSubmission: async () => row('new') })
  const loading = session.loadHistory(); await session.submit({ file: {}, fileName: 'new.png' })
  get.resolve([{ ...row('new'), status: 'FINALIZED', teacher_result: { final_status: 'COMPLETED', feedback: 'Đã chốt thật' } }]); await loading
  assert.equal(session.getSnapshot().history.data.length, 1)
  assert.equal(session.getSnapshot().history.data[0].result.feedback, 'Đã chốt thật')
})

test('mismatched assignment responses cannot produce a receipt or leak another history', async () => {
  const session = createStudentSubmissionSession('a', { listMySubmissions: async () => [{ ...row('wrong'), assignment_id: 'b' }], createSubmission: async () => ({ ...row('wrong'), assignment_id: 'b' }) })
  await session.loadHistory()
  assert.equal(session.getSnapshot().history.status, 'error')
  assert.deepEqual(session.getSnapshot().history.data, [])
  await session.submit({ file: {}, fileName: 'file.png' })
  assert.equal(session.getSnapshot().submit.status, 'error')
  assert.deepEqual(session.getSnapshot().history.data, [])
})

test('late history failure retains confirmed submission and reports the history error honestly', async () => {
  const get = deferred()
  const session = createStudentSubmissionSession('a', { listMySubmissions: () => get.promise, createSubmission: async () => row('new') })
  const loading = session.loadHistory()
  await session.submit({ file: {}, fileName: 'new.png' })
  get.reject(new Error('Mất kết nối')); await loading
  assert.equal(session.getSnapshot().history.status, 'error')
  assert.equal(session.getSnapshot().history.message, 'Mất kết nối')
  assert.deepEqual(session.getSnapshot().history.data.map(item => item.id), ['new'])
})

test('pending lock prevents duplicate POST and error allows explicit retry with the same file', async () => {
  const post = deferred(); let calls = 0
  const file = { name: 'abc.png' }
  const session = createStudentSubmissionSession('a', { listMySubmissions: async () => [], createSubmission: (id, received, filename) => { calls++; assert.equal(id, 'a'); assert.equal(received, file); assert.equal(filename, 'abc.png'); return calls === 1 ? post.promise : Promise.resolve(row('ok')) } })
  const first = session.submit({ file, fileName: 'abc.png' })
  await session.submit({ file, fileName: 'abc.png' })
  assert.equal(calls, 1)
  post.reject(new Error('Lỗi')); await first
  assert.equal(session.getSnapshot().submit.status, 'error')
  await session.submit({ file, fileName: 'abc.png' })
  assert.equal(calls, 2)
  assert.equal(session.getSnapshot().submit.status, 'success')
})

test('unmount and a new assignment isolate pending GET/POST responses', async () => {
  const get = deferred(), post = deferred()
  const old = createStudentSubmissionSession('a', { listMySubmissions: () => get.promise, createSubmission: () => post.promise })
  const loading = old.loadHistory(), sending = old.submit({ file: {}, fileName: 'old.png' })
  old.deactivate()
  const fresh = createStudentSubmissionSession('b', { listMySubmissions: async () => [], createSubmission: async () => ({ ...row('b'), assignment_id: 'b' }) })
  await fresh.loadHistory()
  get.resolve([row('a')]); post.resolve(row('a')); await Promise.all([loading, sending])
  assert.deepEqual(fresh.getSnapshot().history.data, [])
  assert.equal(old.getSnapshot().submit.status, 'loading')
})

test('effect replay rejects the obsolete GET but accepts the latest lifecycle', async () => {
  const first = deferred(), second = deferred(); let calls = 0
  const session = createStudentSubmissionSession('a', { listMySubmissions: () => (++calls === 1 ? first : second).promise })
  const one = session.loadHistory(); session.deactivate(); const two = session.loadHistory()
  second.resolve([row('right')]); await two
  first.resolve([row('wrong')]); await one
  assert.deepEqual(session.getSnapshot().history.data.map(item => item.id), ['right'])
})
