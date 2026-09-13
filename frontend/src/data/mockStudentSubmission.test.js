import assert from 'node:assert/strict'
import test from 'node:test'

import { getAssignmentAvailability } from './assignmentDeadline.js'
import { createStoredAssignment } from './mockAssignmentStore.js'
import { deleteStoredClass } from './mockClassStore.js'
import { getMockUser } from './mockSession.js'
import { getStudentAssignmentSnapshot } from './mockStudentAccess.js'
import { mergeStudentRows } from './mockStudentStore.js'
import { submitStudentNote } from './mockStudentSubmission.js'
import { getStoredSubmissions } from './mockSubmissionStore.js'

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

const student = getMockUser('student')
const form = { assignmentId: 'nam-xuong', fileName: 'note.png', fileSizeBytes: 1000 }
const beforeDeadline = () => Date.parse('2026-09-18T16:58:00Z')
const atDeadline = () => Date.parse('2026-09-18T16:59:00Z')

test('saves an open assignment using the current student, ignoring a supplied student ID', async () => {
  const storage = createMemoryStorage()
  const otherStudent = { ...student, id: 'student-bao', studentId: 'HS260102', name: 'Trần Hoàng Bảo' }
  const result = await submitStudentNote(otherStudent, {
    ...form, studentId: 'HS260101',
  }, 'success', 0, storage, beforeDeadline)

  assert.equal(result.status, 'success')
  assert.equal(result.data.studentId, 'HS260102')
  assert.equal(result.data.assignmentId, form.assignmentId)
  assert.equal(result.data.status, 'submitted')
  assert.deepEqual(getStoredSubmissions(form.assignmentId, storage), [result.data])
})

test('denies submissions at and after the canonical deadline without writing storage', async () => {
  for (const now of [atDeadline, () => atDeadline() + 1]) {
    const storage = createMemoryStorage()
    const result = await submitStudentNote(student, form, 'success', 0, storage, now)
    assert.equal(result.status, 'error')
    assert.match(result.message, /hết hạn/)
    assert.equal(storage.getItem('educraft.submissions'), null)
  }
})

test('denies an explicitly closed activity even before its deadline', async () => {
  const storage = createMemoryStorage()
  const result = await submitStudentNote(student, {
    ...form, assignmentId: 'nghi-luan',
  }, 'success', 0, storage, () => Date.parse('2026-09-01T00:00:00Z'))
  assert.equal(result.status, 'error')
  assert.match(result.message, /đã đóng/)
  assert.equal(storage.getItem('educraft.submissions'), null)
})

test('rejects the existing nghi-luan fixture on 13 September 2026', async () => {
  const storage = createMemoryStorage()
  const now = () => Date.parse('2026-09-13T00:00:00+07:00')
  const snapshot = getStudentAssignmentSnapshot(student, 'nghi-luan', storage)

  assert.equal(snapshot.status, 'success')
  assert.equal(snapshot.data.dueAt, '2026-09-12T23:59:00+07:00')
  assert.equal(getAssignmentAvailability(snapshot.data, now()).isOpen, false)

  const result = await submitStudentNote(student, {
    ...form,
    assignmentId: 'nghi-luan',
  }, 'success', 0, storage, now)

  assert.equal(result.status, 'error')
  assert.match(result.message, /hết hạn/)
  assert.equal(storage.getItem('educraft.submissions'), null)
})

test('denies nonstudents and assignments outside the current membership', async () => {
  for (const [user, assignmentId] of [
    [null, 'nam-xuong'], [getMockUser('teacher'), 'nam-xuong'],
    [student, 'lich-su-1'], [student, 'missing'],
  ]) {
    const storage = createMemoryStorage()
    const result = await submitStudentNote(user, { ...form, assignmentId }, 'success', 0, storage, beforeDeadline)
    assert.equal(result.status, 'error')
    assert.equal(result.message, 'Bài kiểm tra không khả dụng.')
    assert.equal(storage.getItem('educraft.submissions'), null)
  }
})

test('rechecks membership after the mock delay and before saving', async () => {
  const storage = createMemoryStorage()
  assert.equal(getStudentAssignmentSnapshot(student, form.assignmentId, storage).status, 'success')
  const pending = submitStudentNote(student, form, 'success', 0, storage, beforeDeadline)
  // Changing the roster while the request is pending revokes the fallback membership.
  mergeStudentRows('10A1', [{ code: 'HS260102', name: 'Trần Hoàng Bảo' }], storage)
  assert.equal((await pending).status, 'error')
  assert.equal(storage.getItem('educraft.submissions'), null)
})

test('checks the clock again when saving instead of using the time the form opened', async () => {
  const storage = createMemoryStorage()
  let now = beforeDeadline()
  const snapshot = getStudentAssignmentSnapshot(student, form.assignmentId, storage)
  assert.equal(getAssignmentAvailability(snapshot.data, now).isOpen, true)
  const pending = submitStudentNote(student, form, 'success', 0, storage, () => now)
  now = atDeadline()
  assert.equal((await pending).status, 'error')
  assert.equal(storage.getItem('educraft.submissions'), null)
})

test('denies a class deleted while the submission is pending', async () => {
  const storage = createMemoryStorage()
  const pending = submitStudentNote(student, form, 'success', 0, storage, beforeDeadline)
  deleteStoredClass('10A1', storage)
  assert.equal((await pending).status, 'error')
  assert.deepEqual(getStoredSubmissions(form.assignmentId, storage), [])
})

test('new teacher-created assignments use their persisted canonical deadline', async () => {
  const storage = createMemoryStorage()
  const assignment = createStoredAssignment({
    classId: '10A1', title: 'New note', dueAt: '2026-09-18T23:59', threshold: '80',
  }, storage)
  const submissionForm = { ...form, assignmentId: assignment.id }
  assert.equal((await submitStudentNote(student, submissionForm, 'success', 0, storage, beforeDeadline)).status, 'success')
  assert.equal((await submitStudentNote(student, submissionForm, 'success', 0, storage, atDeadline)).status, 'error')
  assert.equal(getStoredSubmissions(assignment.id, storage).length, 1)
})

test('revalidates file selection before saving', async () => {
  const storage = createMemoryStorage()
  for (const invalid of [
    { fileName: '' }, { fileName: 'note.pdf' }, { fileSizeBytes: 0 },
    { fileSizeBytes: 5 * 1024 * 1024 + 1 },
  ]) {
    const result = await submitStudentNote(student, { ...form, ...invalid }, 'success', 0, storage, beforeDeadline)
    assert.equal(result.status, 'error')
    assert.ok(result.errors.file)
  }
  assert.equal(storage.getItem('educraft.submissions'), null)
})

test('keeps mock errors visible without saving and propagates storage failures to the page', async () => {
  const storage = createMemoryStorage()
  const result = await submitStudentNote(student, form, 'error', 0, storage, beforeDeadline)
  assert.equal(result.status, 'error')
  assert.equal(storage.getItem('educraft.submissions'), null)
  const failingStorage = { ...storage, setItem() { throw new Error('Storage full') } }
  await assert.rejects(
    submitStudentNote(student, form, 'success', 0, failingStorage, beforeDeadline),
    /Storage full/,
  )
})
