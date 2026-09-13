import assert from 'node:assert/strict'
import test from 'node:test'

import { getAssignmentAvailability } from './assignmentDeadline.js'
import { createStoredAssignment } from './mockAssignmentStore.js'
import { deleteStoredClass } from './mockClassStore.js'
import { getMockUser } from './mockSession.js'
import { getStudentAssignmentSnapshot } from './mockStudentAccess.js'
import { mergeStudentRows } from './mockStudentStore.js'
import {
  getStudentSubmissionHistory,
  submitStudentNote,
} from './mockStudentSubmission.js'
import {
  createStoredSubmission,
  getStoredSubmissions,
} from './mockSubmissionStore.js'

function createMemoryStorage(values = new Map()) {
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

test('shows the first successful submission as attempt one', async () => {
  const storage = createMemoryStorage()
  const result = await submitStudentNote(
    student,
    form,
    'success',
    0,
    storage,
    beforeDeadline,
  )
  const history = getStudentSubmissionHistory(student, form.assignmentId, storage)

  assert.equal(result.status, 'success')
  assert.deepEqual(history, {
    status: 'success',
    data: [{
      id: result.data.id,
      attemptNumber: 1,
      fileName: 'note.png',
      submittedAt: result.data.submittedAt,
      status: 'submitted',
    }],
  })
})

test('reads persisted history through a new refresh-style storage instance', async () => {
  const values = new Map()
  const initialStorage = createMemoryStorage(values)
  const result = await submitStudentNote(
    student,
    form,
    'success',
    0,
    initialStorage,
    beforeDeadline,
  )
  const refreshedStorage = createMemoryStorage(values)
  const history = getStudentSubmissionHistory(student, form.assignmentId, refreshedStorage)

  assert.equal(history.status, 'success')
  assert.equal(history.data.length, 1)
  assert.equal(history.data[0].id, result.data.id)
  assert.equal(history.data[0].fileName, 'note.png')
})

test('creates attempt two without overwriting attempt one', async () => {
  const storage = createMemoryStorage()
  const first = await submitStudentNote(
    student,
    { ...form, fileName: 'attempt-one.png' },
    'success',
    0,
    storage,
    beforeDeadline,
  )
  const second = await submitStudentNote(
    student,
    { ...form, fileName: 'attempt-two.jpg' },
    'success',
    0,
    storage,
    beforeDeadline,
  )
  const history = getStudentSubmissionHistory(student, form.assignmentId, storage)

  assert.notEqual(first.data.id, second.data.id)
  assert.deepEqual(
    history.data.map(({ attemptNumber, fileName }) => ({ attemptNumber, fileName })),
    [
      { attemptNumber: 1, fileName: 'attempt-one.png' },
      { attemptNumber: 2, fileName: 'attempt-two.jpg' },
    ],
  )
  assert.equal(getStoredSubmissions(form.assignmentId, storage).length, 2)
})

test('orders attempts chronologically and excludes another student submissions', () => {
  const storage = createMemoryStorage()
  const common = {
    assignmentId: form.assignmentId,
    fileSizeBytes: 1000,
    status: 'submitted',
  }
  const submissions = [
    { ...common, id: 'current-later', studentId: student.studentId, fileName: 'later.png', submittedAt: '2026-09-17T09:00:00+07:00' },
    { ...common, id: 'other', studentId: 'HS260102', fileName: 'other.png', submittedAt: '2026-09-16T08:00:00+07:00', score: 98, feedback: 'Teacher only' },
    { ...common, id: 'current-earlier', studentId: student.studentId, fileName: 'earlier.png', submittedAt: '2026-09-16T09:00:00+07:00', score: 90, feedback: 'Hidden' },
  ]
  storage.setItem('educraft.submissions', JSON.stringify(submissions))
  const history = getStudentSubmissionHistory(student, form.assignmentId, storage)

  assert.deepEqual(history.data, [
    { id: 'current-earlier', attemptNumber: 1, fileName: 'earlier.png', submittedAt: '2026-09-16T09:00:00+07:00', status: 'submitted' },
    { id: 'current-later', attemptNumber: 2, fileName: 'later.png', submittedAt: '2026-09-17T09:00:00+07:00', status: 'submitted' },
  ])
  assert.equal(Object.hasOwn(history.data[0], 'score'), false)
  assert.equal(Object.hasOwn(history.data[0], 'feedback'), false)
})

test('rejects resubmission after the deadline without replacing existing history', async () => {
  const storage = createMemoryStorage()
  const first = await submitStudentNote(
    student,
    form,
    'success',
    0,
    storage,
    beforeDeadline,
  )
  const second = await submitStudentNote(
    student,
    { ...form, fileName: 'late-attempt.png' },
    'success',
    0,
    storage,
    atDeadline,
  )
  const history = getStudentSubmissionHistory(student, form.assignmentId, storage)

  assert.equal(first.status, 'success')
  assert.equal(second.status, 'error')
  assert.match(second.message, /hết hạn/)
  assert.equal(history.data.length, 1)
  assert.equal(history.data[0].fileName, 'note.png')
})

test('keeps persisted history readable after the deadline', () => {
  const storage = createMemoryStorage()
  const saved = createStoredSubmission({
    ...form,
    studentId: student.studentId,
  }, storage)
  const snapshot = getStudentAssignmentSnapshot(student, form.assignmentId, storage)

  assert.equal(getAssignmentAvailability(snapshot.data, atDeadline()).isOpen, false)
  assert.deepEqual(getStudentSubmissionHistory(student, form.assignmentId, storage).data, [{
    id: saved.id,
    attemptNumber: 1,
    fileName: saved.fileName,
    submittedAt: saved.submittedAt,
    status: 'submitted',
  }])
})
