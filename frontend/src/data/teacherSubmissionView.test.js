import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatSubmissionAttempt,
  mapTeacherSubmission,
  selectTeacherSubmission,
} from './teacherSubmissionView.js'

function apiSubmission(id, attemptNumber) {
  return {
    id,
    assignment_id: 'assignment-1',
    student_id: 'student-profile-1',
    attempt_number: attemptNumber,
    status: 'SUBMITTED',
    submitted_at: '2026-09-17T13:00:00Z',
    student: {
      full_name: 'Nguyen An Binh',
      student_code: 'student01',
    },
    files: [{ original_filename: 'notes.png' }],
  }
}

test('maps the Student full name as primary identity and preserves backend attempt numbers', () => {
  const attempts = [
    mapTeacherSubmission(apiSubmission('submission-1', 1)),
    mapTeacherSubmission(apiSubmission('submission-2', 2)),
  ]

  assert.deepEqual(attempts.map(({ id, studentName, studentCode, attemptNumber }) => ({
    id,
    studentName,
    studentCode,
    attemptNumber,
  })), [
    {
      id: 'submission-1',
      studentName: 'Nguyen An Binh',
      studentCode: 'student01',
      attemptNumber: 1,
    },
    {
      id: 'submission-2',
      studentName: 'Nguyen An Binh',
      studentCode: 'student01',
      attemptNumber: 2,
    },
  ])
  assert.equal(formatSubmissionAttempt(attempts[0].attemptNumber), 'Lần 1')
  assert.equal(formatSubmissionAttempt(attempts[1].attemptNumber), 'Lần 2')
})

test('selects the exact submission ID without renumbering same-Student attempts', () => {
  const attempts = [
    mapTeacherSubmission(apiSubmission('submission-1', 1)),
    mapTeacherSubmission(apiSubmission('submission-2', 2)),
  ]

  const selected = selectTeacherSubmission(attempts, 'submission-2')

  assert.equal(selected.id, 'submission-2')
  assert.equal(selected.attemptNumber, 2)
  assert.deepEqual(attempts.map((attempt) => attempt.attemptNumber), [1, 2])
})
