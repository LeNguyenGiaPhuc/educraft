import assert from 'node:assert/strict'
import test from 'node:test'

import {
  submitNote,
  validateSubmissionForm,
} from './mockSubmission.js'
import { getStoredSubmissions } from './mockSubmissionStore.js'
import * as submissionApi from './mockSubmission.js'

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

test('requires a note image before submission', () => {
  assert.deepEqual(validateSubmissionForm({}), {
    file: 'Chọn ảnh bài ghi để nộp.',
  })
})

test('rejects unsupported note image formats', () => {
  const errors = validateSubmissionForm({
    fileName: 'note.pdf',
    fileSizeBytes: 1000,
  })

  assert.equal(errors.file, 'Chỉ nhận file JPG, JPEG hoặc PNG.')
})

test('rejects note images larger than five megabytes', () => {
  const errors = validateSubmissionForm({
    fileName: 'note.png',
    fileSizeBytes: 5 * 1024 * 1024 + 1,
  })

  assert.equal(errors.file, 'Kích thước file không được vượt quá 5 MB.')
})

test('accepts a valid note image', () => {
  assert.deepEqual(
    validateSubmissionForm({
      fileName: 'note.png',
      fileSizeBytes: 2 * 1024 * 1024,
    }),
    {},
  )
})

test('stores a successful note submission', async () => {
  const storage = createMemoryStorage()
  const result = await submitNote(
    {
      assignmentId: 'nam-xuong',
      studentId: 'HS260101',
      fileName: 'note.png',
      fileSizeBytes: 2 * 1024 * 1024,
    },
    'success',
    0,
    storage,
  )

  const submissions = getStoredSubmissions('nam-xuong', storage)

  assert.equal(result.status, 'success')
  assert.equal(submissions.length, 1)
  assert.equal(submissions[0].studentId, 'HS260101')
  assert.equal(submissions[0].status, 'submitted')
})

test('returns a visible error for a failed note submission', async () => {
  const result = await submitNote(
    {
      assignmentId: 'nam-xuong',
      studentId: 'HS260101',
      fileName: 'note.png',
      fileSizeBytes: 1000,
    },
    'error',
  )

  assert.deepEqual(result, {
    status: 'error',
    message: 'Không thể nộp bài lúc này. Vui lòng thử lại.',
  })
})

test('requires an allowed final status and feedback before a teacher can finalize a submission', () => {
  assert.equal(typeof submissionApi.validateReviewForm, 'function')

  assert.deepEqual(submissionApi.validateReviewForm({}), {
    finalStatus: 'Chọn kết quả cuối cùng.',
    feedback: 'Nhập nhận xét cho học sinh.',
  })

  assert.equal(
    submissionApi.validateReviewForm({
      finalStatus: 'automatic_pass',
      feedback: 'Không được dùng trạng thái ngoài quy trình.',
    }).finalStatus,
    'Kết quả cuối cùng không hợp lệ.',
  )
})

test('stores the teacher-finalized status and feedback without a numeric score', async () => {
  const storage = createMemoryStorage()
  const submission = await submitNote(
    {
      assignmentId: 'nam-xuong',
      studentId: 'HS260101',
      fileName: 'note.png',
      fileSizeBytes: 2000,
    },
    'success',
    0,
    storage,
  )

  assert.equal(typeof submissionApi.reviewSubmission, 'function')

  const result = await submissionApi.reviewSubmission(
    {
      submissionId: submission.data.id,
      finalStatus: 'needs_completion',
      feedback: 'Bài ghi đầy đủ, cần bổ sung phần kết luận.',
    },
    'success',
    0,
    storage,
  )
  const saved = getStoredSubmissions('nam-xuong', storage)[0]

  assert.equal(result.status, 'success')
  assert.equal(saved.status, 'approved')
  assert.equal(saved.finalStatus, 'needs_completion')
  assert.equal(Object.hasOwn(saved, 'score'), false)
  assert.equal(saved.feedback, 'Bài ghi đầy đủ, cần bổ sung phần kết luận.')
})

test('can persist a teacher review for a mock submission fixture', async () => {
  const storage = createMemoryStorage()
  const result = await submissionApi.reviewSubmission(
    {
      submissionId: 'mock-submission-nam-xuong-001',
      finalStatus: 'completed',
      feedback: 'Đã kiểm tra và chốt kết quả.',
      submission: {
        id: 'mock-submission-nam-xuong-001',
        assignmentId: 'nam-xuong',
        studentId: 'HS260101',
        fileName: 'bai-ghi-nam-xuong-hs260101.png',
        fileSizeBytes: 2400000,
        submittedAt: '2026-09-17T15:30:00+07:00',
        status: 'submitted',
      },
    },
    'success',
    0,
    storage,
  )

  assert.equal(result.status, 'success')
  assert.equal(getStoredSubmissions('nam-xuong', storage)[0].finalStatus, 'completed')
})
