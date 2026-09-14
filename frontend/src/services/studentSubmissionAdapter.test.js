import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isBackendAssignmentId,
  mapStudentSubmission,
  mapStudentSubmissions,
} from './studentSubmissionAdapter.js'

test('recognizes UUID assignment ids used by the backend', () => {
  assert.equal(isBackendAssignmentId('11111111-1111-4111-8111-111111111111'), true)
  assert.equal(isBackendAssignmentId('nam-xuong'), false)
})

test('maps a backend submission and finalized teacher result to the student view', () => {
  const result = mapStudentSubmission({
    id: 'submission-1',
    attempt_number: 2,
    status: 'FINALIZED',
    submitted_at: '2026-09-14T09:30:00Z',
    files: [{ original_filename: 'note.png', size_bytes: 1200 }],
    teacher_result: {
      final_status: 'COMPLETED',
      feedback: 'Đạt yêu cầu.',
      is_finalized: true,
    },
  })

  assert.deepEqual(result, {
    id: 'submission-1',
    attemptNumber: 2,
    fileName: 'note.png',
    fileSizeBytes: 1200,
    submittedAt: '2026-09-14T09:30:00Z',
    status: 'approved',
    result: {
      finalStatus: 'completed',
      feedback: 'Đạt yêu cầu.',
    },
  })
})

test('maps an empty backend history to an empty array', () => {
  assert.deepEqual(mapStudentSubmissions([]), [])
  assert.deepEqual(mapStudentSubmissions(undefined), [])
})

test('uses a safe filename when a submission has no file record', () => {
  assert.equal(
    mapStudentSubmission({ id: 'submission-2', status: 'SUBMITTED' }).fileName,
    'Bài nộp',
  )
})
