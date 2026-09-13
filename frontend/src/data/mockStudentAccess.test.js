import assert from 'node:assert/strict'
import test from 'node:test'

import { createStoredAssignment } from './mockAssignmentStore.js'
import { createStoredClass, deleteStoredClass } from './mockClassStore.js'
import { getMockUser } from './mockSession.js'
import { getStudentAssignmentSnapshot, isStudentInClass } from './mockStudentAccess.js'
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

const student = getMockUser('student')

test('uses the fallback roster instead of class student counts for membership', () => {
  const storage = createMemoryStorage()

  assert.equal(isStudentInClass(student, '10A1', storage), true)
  assert.equal(isStudentInClass(student, '10A2', storage), false)
  assert.equal(isStudentInClass(student, '11A1', storage), false)
})

test('denies unknown students, nonstudent identities, and missing classes', () => {
  const storage = createMemoryStorage()

  assert.equal(isStudentInClass({ ...student, studentId: 'UNKNOWN' }, '10A1', storage), false)
  assert.equal(isStudentInClass(getMockUser('teacher'), '10A1', storage), false)
  assert.equal(isStudentInClass(null, '10A1', storage), false)
  assert.equal(isStudentInClass(student, 'missing', storage), false)
})

test('uses an imported roster in place of fallback membership', () => {
  const storage = createMemoryStorage()
  assert.equal(isStudentInClass(student, '10A1', storage), true)

  mergeStudentRows('10A1', [{ code: 'HS260102', name: 'Trần Hoàng Bảo' }], storage)
  assert.equal(isStudentInClass(student, '10A1', storage), false)
  assert.equal(getStudentAssignmentSnapshot(student, 'nam-xuong', storage).status, 'error')

  mergeStudentRows('10A1', [{ code: student.studentId, name: student.name }], storage)
  assert.equal(isStudentInClass(student, '10A1', storage), true)
  assert.equal(getStudentAssignmentSnapshot(student, 'nam-xuong', storage).status, 'success')
})

test('returns an accessible assignment without teacher reference or submission details', () => {
  const snapshot = getStudentAssignmentSnapshot(student, 'nam-xuong', createMemoryStorage())

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.id, 'nam-xuong')
  assert.equal(snapshot.data.classroom.id, '10A1')
  assert.equal(Object.hasOwn(snapshot.data, 'submissions'), false)
  assert.equal(Object.hasOwn(snapshot.data, 'reference'), false)
  assert.equal(Object.hasOwn(snapshot.data.classroom, 'students'), false)
})

test('returns the same unavailable response without data for missing or unauthorized assignments', () => {
  const storage = createMemoryStorage()
  const unavailable = {
    status: 'error',
    message: 'Bài kiểm tra không khả dụng.',
  }

  assert.deepEqual(getStudentAssignmentSnapshot(student, 'missing', storage), unavailable)
  assert.deepEqual(getStudentAssignmentSnapshot(student, 'lich-su-1', storage), unavailable)
  assert.deepEqual(getStudentAssignmentSnapshot(student, 'sinh-hoc-1', storage), unavailable)
  assert.deepEqual(getStudentAssignmentSnapshot(null, 'nam-xuong', storage), unavailable)
  assert.deepEqual(
    getStudentAssignmentSnapshot(getMockUser('teacher'), 'nam-xuong', storage),
    unavailable,
  )
})

test('checks newly stored assignment access against the class roster', () => {
  const storage = createMemoryStorage()
  createStoredClass({
    id: '12B1',
    subject: 'Toán',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
  }, storage)
  const assignment = createStoredAssignment({
    classId: '12B1',
    title: 'Bài ghi mới',
    dueAt: '2026-09-18T23:59',
    threshold: '80',
  }, storage)

  assert.equal(getStudentAssignmentSnapshot(student, assignment.id, storage).status, 'error')
  mergeStudentRows('12B1', [{ code: student.studentId, name: student.name }], storage)
  assert.equal(getStudentAssignmentSnapshot(student, assignment.id, storage).status, 'success')

  deleteStoredClass('12B1', storage)
  assert.equal(isStudentInClass(student, '12B1', storage), false)
  assert.equal(getStudentAssignmentSnapshot(student, assignment.id, storage).status, 'error')
})

test('denies deleted fixture classes even when their assignment fixtures still exist', () => {
  const storage = createMemoryStorage()
  deleteStoredClass('10A1', storage)

  assert.equal(isStudentInClass(student, '10A1', storage), false)
  assert.equal(getStudentAssignmentSnapshot(student, 'nam-xuong', storage).status, 'error')
})

test('keeps membership isolated between injected stores', () => {
  const firstStorage = createMemoryStorage()
  const secondStorage = createMemoryStorage()
  mergeStudentRows('10A2', [{ code: student.studentId, name: student.name }], firstStorage)

  assert.equal(isStudentInClass(student, '10A2', firstStorage), true)
  assert.equal(isStudentInClass(student, '10A2', secondStorage), false)
  assert.equal(getStudentAssignmentSnapshot(student, 'lich-su-1', firstStorage).status, 'success')
  assert.equal(getStudentAssignmentSnapshot(student, 'lich-su-1', secondStorage).status, 'error')
})
