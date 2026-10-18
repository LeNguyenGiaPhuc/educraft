import test from 'node:test'
import assert from 'node:assert/strict'
import { loadClassDetail, classDetailForRoute } from '../../src/data/classDetailLoading.js'
test('base list succeeds without requesting or waiting for counts', async () => {
  const state = await loadClassDetail('A', Promise.resolve({ id: 'A' }), Promise.resolve([{ id: 'a', title: 'Bài mới' }]))
  assert.equal(state.status, 'success')
  assert.equal(state.classId, 'A')
  assert.equal(state.assignments[0].submissionCount, null)
})
test('direct class switch never renders old header or rows while next effect is pending', () => {
  const old = { status: 'success', classId: 'A', classroom: { id: 'A' }, assignments: [{ id: 'a' }] }
  assert.equal(classDetailForRoute(old, 'A'), old)
  assert.deepEqual(classDetailForRoute(old, 'B'), { status: 'loading', classId: 'B', classroom: null, assignments: [] })
})
