import assert from 'node:assert/strict'
import test from 'node:test'

import { getDashboardSnapshot } from './mockDashboard.js'

test('returns the teacher classes for a successful dashboard load', () => {
  const snapshot = getDashboardSnapshot('success')

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.length, 3)
  assert.equal(snapshot.data[0].id, '10A1')
})

test('returns an explicit loading snapshot', () => {
  assert.deepEqual(getDashboardSnapshot('loading'), { status: 'loading' })
})

test('returns an empty success snapshot', () => {
  assert.deepEqual(getDashboardSnapshot('empty'), {
    status: 'success',
    data: [],
  })
})

test('returns an actionable error snapshot', () => {
  const snapshot = getDashboardSnapshot('error')

  assert.equal(snapshot.status, 'error')
  assert.match(snapshot.message, /danh sách lớp/i)
})
