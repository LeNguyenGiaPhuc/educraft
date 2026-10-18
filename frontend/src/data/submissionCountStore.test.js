import test from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers'
import { createCountPool, createSubmissionCountStore, watchVisibleCounts } from './submissionCountStore.js'
import { buildAssignmentArchive } from './classAssignmentArchive.js'
const tick = () => new Promise(resolve => setImmediate(resolve))
function setup() {
  const pending = [], calls = []
  let active = 0, peak = 0, time = 0
  const pool = createCountPool(4)
  const store = createSubmissionCountStore({ pool, now: () => time, listSubmissions: id => {
    calls.push(id); active++; peak = Math.max(peak, active)
    return new Promise((resolve, reject) => pending.push({ id, resolve: data => { active--; resolve(data) }, reject: () => { active--; reject(new Error('network')) } }))
  } })
  async function drain() { while (pending.length) { pending.shift().resolve([]); await tick() } }
  return { store, pool, pending, calls, drain, peak: () => peak, age: () => { time += 60001 } }
}
test('0/1/25/100/500 loaded records schedule only visible page and concurrency never exceeds four', async () => {
  for (const size of [0, 1, 25, 100, 500]) {
    const s = setup()
    const rows = Array.from({ length: size }, (_, i) => ({ id: `a${i}`, title: `Lịch sử ${i}`, statusCode: 'OPEN' }))
    const ids = buildAssignmentArchive({ rows }).items.map(row => row.id)
    s.store.setVisible('classA', ids)
    assert.equal(s.store.stats().scheduled, Math.min(25, size))
    assert.equal(s.calls.length, Math.min(4, size))
    assert.equal(s.store.getSnapshot().a0?.status, size ? 'loading' : undefined)
    await s.drain()
    assert.equal(s.calls.length, Math.min(25, size))
    assert.ok(s.peak() <= 4)
    if (size) assert.equal(s.store.getSnapshot().a0.count, 0)
  }
})
test('search/filter and rapid page changes discard queued old IDs, preserve slots and ignore stale responses', async () => {
  const s = setup()
  s.store.setVisible('A', Array.from({ length: 25 }, (_, i) => `old${i}`))
  s.store.setVisible('A', ['page2'])
  s.store.setVisible('A', ['search-result'])
  assert.equal(s.calls.length, 4)
  assert.equal(s.store.stats().skipped, 22)
  await s.drain()
  assert.deepEqual(s.calls, ['old0', 'old1', 'old2', 'old3', 'search-result'])
  assert.equal(s.store.stats().stale, 4)
  assert.equal(s.store.getSnapshot()['search-result'].status, 'success')
  assert.equal(s.store.getSnapshot().old0, undefined)
})
test('class switch and unmount reject old completion even for identical assignment IDs', async () => {
  const s = setup()
  s.store.setVisible('A', ['same'])
  const stop = s.store.setVisible('B', ['same'])
  s.pending.shift().resolve([{}, {}]); await tick()
  assert.equal(s.store.getSnapshot().same.status, 'loading')
  stop()
  s.pending.shift().resolve([{}]); await tick()
  assert.equal(s.store.getSnapshot().same?.count, undefined)
  assert.equal(s.store.stats().stale, 2)
})
test('render snapshot is empty for another class before its effect runs', () => {
  const s = setup()
  s.store.setVisible('A', ['same'])
  assert.deepEqual(s.store.getSnapshot('B'), {})
})
test('malformed payload remains error, invalidated in-flight result cannot repopulate cache', async () => {
  const pool = createCountPool(4)
  const invalid = createSubmissionCountStore({ pool, listSubmissions: async () => null })
  invalid.setVisible('A', ['bad']); await tick()
  assert.equal(invalid.getSnapshot().bad.status, 'error')
  assert.equal(invalid.getSnapshot().bad.count, undefined)
  const s = setup(); s.store.setVisible('A', ['one']); s.store.invalidate('one')
  s.pending.shift().resolve([{}]); await tick()
  assert.equal(s.store.getSnapshot().one.status, 'idle')
  assert.equal(s.store.stats().stale, 1)
})
test('valid cache hit, TTL expiry, explicit invalidation and retry stay keyed to assignment ID', async () => {
  const s = setup()
  s.store.setVisible('A', ['one', 'two'])
  s.pending.shift().resolve([{}, {}]); s.pending.shift().reject(); await tick()
  assert.equal(s.store.getSnapshot().one.count, 2)
  assert.equal(s.store.getSnapshot().two.status, 'error')
  assert.equal(s.store.getSnapshot().two.count, undefined)
  s.store.setVisible('A', ['one', 'two'])
  assert.equal(s.calls.length, 2)
  s.store.retry('two'); await s.drain()
  assert.equal(s.store.getSnapshot().two.count, 0)
  s.age(); s.store.setVisible('A', ['one'])
  assert.equal(s.calls.length, 4)
  await s.drain()
  s.store.invalidate('one'); s.store.setVisible('A', ['one'])
  assert.equal(s.calls.length, 5)
  await s.drain()
})
test('shared pool bounds overlapping old/new mounted sessions without releasing stale in-flight slots', async () => {
  const s = setup()
  const second = createSubmissionCountStore({ pool: s.pool, listSubmissions: async () => [] })
  const stop = s.store.setVisible('A', ['a','b','c','d','e'])
  stop(); second.setVisible('B', ['x'])
  assert.equal(second.stats().started, 0)
  await s.drain()
  assert.equal(second.stats().completed, 1)
})
test('debounced visible demand schedules only latest search and cancels on unmount', async () => {
  const s = setup()
  const timers = new Map(); let sequence = 0
  const clock = { setTimer: fn => { timers.set(++sequence, fn); return sequence }, clearTimer: id => timers.delete(id) }
  const stopA = watchVisibleCounts(s.store, 'A', ['old'], clock)
  stopA()
  const stopB = watchVisibleCounts(s.store, 'A', ['new'], clock)
  assert.equal(s.calls.length, 0)
  for (const fn of timers.values()) fn()
  assert.deepEqual(s.calls, ['new'])
  stopB(); await s.drain()
  assert.equal(s.store.stats().stale, 1)
})
test('actual title/status archive filtering replaces demand while requests are in flight', async () => {
  const s = setup()
  const rows = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, title: i % 2 ? 'Lịch sử' : 'Sinh học', statusCode: i % 3 ? 'OPEN' : 'CLOSED' }))
  s.store.setVisible('A', buildAssignmentArchive({ rows }).items.map(row => row.id))
  const filtered = buildAssignmentArchive({ rows, query: 'SINH HOC', status: 'CLOSED' }).items.map(row => row.id)
  s.store.setVisible('A', filtered)
  await s.drain()
  assert.deepEqual(s.calls.slice(4), filtered)
  assert.deepEqual(Object.keys(s.store.getSnapshot()), filtered)
  assert.equal(s.store.stats().skipped, 21)
  assert.ok(s.peak() <= 4)
})
