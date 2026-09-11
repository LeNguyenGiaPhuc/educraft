import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getClassDetailSnapshot,
  getClassTabView,
} from './mockClassDetail.js'
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

test('loads the 10A1 class detail with assignments and students', () => {
  const snapshot = getClassDetailSnapshot('10A1')

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.id, '10A1')
  assert.equal(snapshot.data.assignments.length, 2)
  assert.equal(snapshot.data.students.length, 3)
})

test('includes a stored assignment in the class detail', () => {
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

  const snapshot = getClassDetailSnapshot('10A1', storage)

  assert.equal(snapshot.data.assignments.length, 3)
  assert.equal(snapshot.data.assignments.at(-1).title, 'Bài ghi đã lưu')
})

test('returns the assignment tab by default', () => {
  const snapshot = getClassDetailSnapshot('10A1')
  const view = getClassTabView(snapshot.data, 'assignments')

  assert.equal(view.kind, 'assignments')
  assert.equal(view.rows[0].title, 'Bài ghi Chuyện người con gái Nam Xương')
})

test('returns the student tab when requested', () => {
  const snapshot = getClassDetailSnapshot('10A1')
  const view = getClassTabView(snapshot.data, 'students')

  assert.equal(view.kind, 'students')
  assert.equal(view.rows[0].name, 'Nguyễn An Bình')
})

test('returns an error snapshot for an unknown class', () => {
  const snapshot = getClassDetailSnapshot('unknown')

  assert.equal(snapshot.status, 'error')
  assert.match(snapshot.message, /không tìm thấy lớp/i)
})
