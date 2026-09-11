import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createStoredClass,
  deleteStoredClass,
  getTeacherClasses,
  updateStoredClass,
} from './mockClassStore.js'
import { createStoredAssignment, getStoredAssignments } from './mockAssignmentStore.js'
import { createStoredReference, getStoredReference } from './mockReferenceStore.js'
import { createStoredSubmission, getStoredSubmissions } from './mockSubmissionStore.js'
import { getStoredStudents, mergeStudentRows } from './mockStudentStore.js'

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

test('returns the three default teacher classes when storage is empty', () => {
  const classes = getTeacherClasses(createMemoryStorage())

  assert.equal(classes.length, 3)
  assert.equal(classes[0].id, '10A1')
  assert.equal(classes[0].subject, 'Ngữ văn')
})

test('creates and persists a new class with empty counts', () => {
  const storage = createMemoryStorage()

  const result = createStoredClass(
    {
      id: '12B1',
      subject: 'Toán',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2026–2027',
    },
    storage,
  )

  assert.equal(result.status, 'success')
  assert.deepEqual(result.data, {
    id: '12B1',
    subject: 'Toán',
    name: 'Toán 12B1',
    semester: 'Học kỳ 2',
    schoolYear: 'Năm học 2026–2027',
    studentCount: 0,
    assignmentCount: 0,
    accent: 'green',
  })
  assert.equal(getTeacherClasses(storage).at(-1).name, 'Toán 12B1')
})

test('rejects a class with missing fields or a duplicate code', () => {
  const storage = createMemoryStorage()

  const missingField = createStoredClass(
    {
      id: '12B1',
      subject: '',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2026–2027',
    },
    storage,
  )
  const duplicate = createStoredClass(
    {
      id: '10A1',
      subject: 'Toán',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2026–2027',
    },
    storage,
  )

  assert.equal(missingField.status, 'error')
  assert.equal(missingField.errors.subject, 'Vui lòng nhập môn học.')
  assert.equal(duplicate.status, 'error')
  assert.equal(duplicate.errors.id, 'Mã lớp này đã tồn tại.')
})

test('updates class metadata while keeping its id and existing counts', () => {
  const storage = createMemoryStorage()

  const result = updateStoredClass(
    '10A1',
    {
      subject: 'Ngữ văn nâng cao',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2027–2028',
    },
    storage,
  )

  assert.equal(result.status, 'success')
  assert.equal(result.data.id, '10A1')
  assert.equal(result.data.name, 'Ngữ văn nâng cao 10A1')
  assert.equal(result.data.studentCount, 42)
  assert.equal(result.data.assignmentCount, 3)
  assert.equal(getTeacherClasses(storage)[0].semester, 'Học kỳ 2')
})

test('deletes a class from the stored teacher class list', () => {
  const storage = createMemoryStorage()

  const result = deleteStoredClass('10A2', storage)

  assert.equal(result.status, 'success')
  assert.equal(result.data.id, '10A2')
  assert.equal(getTeacherClasses(storage).some((classroom) => classroom.id === '10A2'), false)
})

test('deleting a class removes its stored assignments and related submissions', () => {
  const storage = createMemoryStorage()
  const classResult = createStoredClass(
    {
      id: '12B1',
      subject: 'Toán',
      semester: 'Học kỳ 2',
      schoolYear: 'Năm học 2026–2027',
    },
    storage,
  )
  const assignment = createStoredAssignment(
    {
      title: 'Bài ghi cần xóa cùng lớp',
      classId: classResult.data.id,
      dueAt: '2026-09-18T23:59',
      threshold: '80',
    },
    storage,
  )

  createStoredReference(
    {
      assignmentId: assignment.id,
      fileName: 'bai-mau.png',
      fileSizeBytes: 1000,
    },
    storage,
  )
  createStoredSubmission(
    {
      assignmentId: assignment.id,
      studentId: 'HS260101',
      fileName: 'bai-nop.png',
      fileSizeBytes: 1000,
    },
    storage,
  )
  mergeStudentRows(
    '12B1',
    [{ code: 'HS260104', name: 'Lê Cẩm Chi', email: '' }],
    storage,
  )

  const result = deleteStoredClass('12B1', storage)

  assert.equal(result.status, 'success')
  assert.deepEqual(getStoredAssignments('12B1', storage), [])
  assert.equal(getStoredReference(assignment.id, storage), null)
  assert.deepEqual(getStoredSubmissions(assignment.id, storage), [])
  assert.deepEqual(getStoredStudents('12B1', storage), [])
})
