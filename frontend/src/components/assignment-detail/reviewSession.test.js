import assert from 'node:assert/strict'
import test from 'node:test'
import { createReviewSession } from './reviewSession.js'

const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('two immediate clicks start one run and publish real stages', async () => {
  const done = deferred()
  const states = []
  let calls = 0
  const session = createReviewSession({ submissionId: 'double-click', onChange: (value) => states.push(value),
    service: { async streamEvaluation(id, { onProgress }) {
      calls += 1
      onProgress({ stage: 'transcribed', submissionId: id })
      return done.promise
    } } })
  const run = session.run()
  await session.run()
  assert.equal(calls, 1)
  assert.equal(states.at(-1).stage, 'transcribed')
  done.resolve({ evaluation: { id: 'saved' } })
  await run
  assert.equal(states.at(-1).status, 'success')
  session.dispose()
})

test('disposing on submission change aborts and ignores late stream response', async () => {
  const done = deferred()
  const states = []
  let signal
  const session = createReviewSession({ submissionId: 'old-submission', onChange: (value) => states.push(value),
    service: { streamEvaluation(_id, options) { signal = options.signal; return done.promise } } })
  const run = session.run()
  session.dispose()
  assert.equal(signal.aborted, true)
  done.resolve({ evaluation: { id: 'late' } })
  await run
  assert.deepEqual(states.map((state) => state.status), ['running'])
})

test('disposed initial GET cannot overwrite the next submission', async () => {
  const done = deferred()
  const states = []
  const session = createReviewSession({ submissionId: 'old-get', onChange: (value) => states.push(value),
    service: { getEvaluation: () => done.promise } })
  const load = session.load()
  session.dispose()
  done.resolve({ id: 'late' })
  await load
  assert.deepEqual(states.map((state) => state.status), ['loading'])
})

test('interrupted run syncs with GET and reopening does not offer another POST', async () => {
  const states = []
  let posts = 0
  let gets = 0
  const service = {
    async streamEvaluation() { posts += 1; throw Object.assign(new Error(), { code: 'AI_STREAM_INTERRUPTED' }) },
    async getEvaluation() { gets += 1; throw Object.assign(new Error(), { status: 404 }) },
  }
  const session = createReviewSession({ submissionId: 'interrupted', service, onChange: (value) => states.push(value) })
  await session.run()
  assert.equal(states.at(-1).status, 'interrupted')
  session.dispose()
  const reopened = createReviewSession({ submissionId: 'interrupted', service, onChange: (value) => states.push(value) })
  await reopened.load()
  assert.equal(states.at(-1).status, 'interrupted')
  service.getEvaluation = async () => { gets += 1; return { id: 'saved-after-disconnect' } }
  await reopened.load({ uncertain: true })
  assert.equal(states.at(-1).status, 'success')
  assert.equal(posts, 1)
  assert.equal(gets, 3)
  reopened.dispose()
})

test('confirmed AI error permits manual review and is not successful', async () => {
  const states = []
  const session = createReviewSession({ submissionId: 'failed', onChange: (value) => states.push(value), service: {
    async streamEvaluation() { throw new Error('Không thể lưu đề xuất.') },
  } })
  await session.run()
  assert.equal(states.at(-1).status, 'error')
  assert.match(states.at(-1).message, /Không thể lưu/)
  session.dispose()
})
