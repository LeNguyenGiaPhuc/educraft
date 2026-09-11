import assert from 'node:assert/strict'
import test from 'node:test'

import {
  submitNote,
  validateSubmissionForm,
} from './mockSubmission.js'
import { getStoredSubmissions } from './mockSubmissionStore.js'

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
