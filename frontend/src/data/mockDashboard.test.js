import assert from 'node:assert/strict'
import test from 'node:test'

import { getDashboardSnapshot } from './mockDashboard.js'
import { createStoredAssignment } from './mockAssignmentStore.js'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('returns the teacher classes for a successful dashboard load', () => {
  const snapshot = getDashboardSnapshot('success')

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.length, 3)
  assert.equal(snapshot.data[0].id, '10A1')
})

test('includes stored assignments in the class count', () => {
  const storage = createMemoryStorage()

  createStoredAssignment(
    {
      title: 'Bài ghi đã lưu',
      classId: '10A1',
      dueAt: '2026-09-18T23:59',
      threshold: '80',
    },
    storage,
  )

  const snapshot = getDashboardSnapshot('success', storage)
  const classroom = snapshot.data.find((item) => item.id === '10A1')

  assert.equal(classroom.assignmentCount, 4)
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
