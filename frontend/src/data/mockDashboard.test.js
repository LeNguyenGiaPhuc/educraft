import assert from 'node:assert/strict'
import test from 'node:test'

import { getDashboardSnapshot } from './mockDashboard.js'
import { createStoredAssignment } from './mockAssignmentStore.js'
import { createStoredClass } from './mockClassStore.js'
import { mergeStudentRows } from './mockStudentStore.js'

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

test('includes a newly created class in the dashboard snapshot', () => {
  const storage = createMemoryStorage()

  createStoredClass(
    {
      id: '12B1',
      subject: 'Toán',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2026–2027',
    },
    storage,
  )

  const snapshot = getDashboardSnapshot('success', storage)
  const classroom = snapshot.data.find((item) => item.id === '12B1')

  assert.equal(classroom.name, 'Toán 12B1')
  assert.equal(classroom.studentCount, 0)
  assert.equal(classroom.assignmentCount, 0)
})

test('includes imported students in the dashboard class count', () => {
  const storage = createMemoryStorage()

  createStoredClass(
    {
      id: '12B1',
      subject: 'Toán',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2026–2027',
    },
    storage,
  )
  mergeStudentRows(
    '12B1',
    [{ code: 'HS260104', name: 'Lê Cẩm Chi', email: '' }],
    storage,
  )

  const snapshot = getDashboardSnapshot('success', storage)
  const classroom = snapshot.data.find((item) => item.id === '12B1')

  assert.equal(classroom.studentCount, 1)
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
