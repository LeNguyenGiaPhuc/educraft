import assert from 'node:assert/strict'
import test from 'node:test'

import * as classDetailData from './mockClassDetail.js'
import { createStoredAssignment } from './mockAssignmentStore.js'
import { createStoredClass } from './mockClassStore.js'
import { createStoredSubmission } from './mockSubmissionStore.js'

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
  const snapshot = classDetailData.getClassDetailSnapshot('10A1')

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

  const snapshot = classDetailData.getClassDetailSnapshot('10A1', storage)

  assert.equal(snapshot.data.assignments.length, 3)
  assert.equal(snapshot.data.assignments.at(-1).title, 'Bài ghi đã lưu')
})

test('opens a newly created class with empty assignment and student lists', () => {
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

  const snapshot = classDetailData.getClassDetailSnapshot('12B1', storage)

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.name, 'Toán 12B1')
  assert.equal(snapshot.data.assignments.length, 0)
  assert.equal(snapshot.data.students.length, 0)
})

test('uses edited class metadata in the class detail', () => {
  const storage = createMemoryStorage()

  storage.setItem(
    'educraft.classes',
    JSON.stringify([
      {
        id: '10A1',
        subject: 'Ngữ văn nâng cao',
        name: 'Ngữ văn nâng cao 10A1',
        semester: 'Học kỳ 2',
        schoolYear: 'Năm học 2027–2028',
        studentCount: 42,
        assignmentCount: 3,
        accent: 'green',
      },
    ]),
  )

  const snapshot = classDetailData.getClassDetailSnapshot('10A1', storage)

  assert.equal(snapshot.data.subject, 'Ngữ văn nâng cao')
  assert.equal(snapshot.data.name, 'Ngữ văn nâng cao 10A1')
  assert.equal(snapshot.data.semester, 'Học kỳ 2')
})

test('returns the assignment tab by default', () => {
  const snapshot = classDetailData.getClassDetailSnapshot('10A1')
  const view = classDetailData.getClassTabView(snapshot.data, 'assignments')

  assert.equal(view.kind, 'assignments')
  assert.equal(view.rows[0].title, 'Bài ghi Chuyện người con gái Nam Xương')
})

test('returns the student tab when requested', () => {
  const snapshot = classDetailData.getClassDetailSnapshot('10A1')
  const view = classDetailData.getClassTabView(snapshot.data, 'students')

  assert.equal(view.kind, 'students')
  assert.equal(view.rows[0].name, 'Nguyễn An Bình')
})

test('returns an error snapshot for an unknown class', () => {
  const snapshot = classDetailData.getClassDetailSnapshot('unknown')

  assert.equal(snapshot.status, 'error')
  assert.match(snapshot.message, /không tìm thấy lớp/i)
})

test('finds an assignment and its class for the student submission page', () => {
  const snapshot = classDetailData.getAssignmentSnapshot('nam-xuong')

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.id, 'nam-xuong')
  assert.equal(snapshot.data.classroom.id, '10A1')
})

test('returns assignment detail data with stored submissions', () => {
  const storage = createMemoryStorage()

  createStoredSubmission(
    {
      assignmentId: 'nam-xuong',
      studentId: 'HS260101',
      fileName: 'note.png',
      fileSizeBytes: 2000,
    },
    storage,
  )

  assert.equal(typeof classDetailData.getAssignmentDetailSnapshot, 'function')

  const snapshot = classDetailData.getAssignmentDetailSnapshot('nam-xuong', storage)

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.reference, null)
  assert.equal(snapshot.data.submissions.some((item) => item.studentId === 'HS260101'), true)
  assert.equal(snapshot.data.submissions.some((item) => item.fileName === 'note.png'), true)
})

test('provides teacher-side mock submissions for the assignment detail page', () => {
  assert.equal(typeof classDetailData.getMockAssignmentSubmissions, 'function')

  const submissions = classDetailData.getMockAssignmentSubmissions('nam-xuong')

  assert.equal(submissions.length, 2)
  assert.equal(submissions[0].studentId, 'HS260101')
  assert.equal(submissions[1].status, 'approved')
})
