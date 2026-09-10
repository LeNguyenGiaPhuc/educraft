import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getDefaultAssignmentForm,
  submitAssignmentDraft,
  validateAssignmentForm,
} from './mockCreateAssignment.js'

test('returns a draft with sensible defaults for the selected class', () => {
  assert.deepEqual(getDefaultAssignmentForm('10A1'), {
    title: '',
    classId: '10A1',
    dueAt: '2026-09-18T23:59',
    threshold: '80',
  })
})

test('reports required-field errors for an empty assignment draft', () => {
  assert.deepEqual(
    validateAssignmentForm({
      title: '',
      classId: '',
      dueAt: '',
      threshold: '',
    }),
    {
      title: 'Nhập tên bài kiểm tra.',
      classId: 'Chọn lớp học.',
      dueAt: 'Chọn hạn nộp.',
      threshold: 'Nhập ngưỡng đạt.',
    },
  )
})

test('rejects a threshold outside the 0 to 100 percent range', () => {
  const errors = validateAssignmentForm({
    title: 'Bài ghi thử nghiệm',
    classId: '10A1',
    dueAt: '2026-09-18T23:59',
    threshold: '101',
  })

  assert.equal(errors.threshold, 'Ngưỡng đạt phải từ 0 đến 100%.')
})

test('accepts a complete assignment draft', () => {
  assert.deepEqual(
    validateAssignmentForm({
      title: 'Bài ghi Chuyện người con gái Nam Xương',
      classId: '10A1',
      dueAt: '2026-09-18T23:59',
      threshold: '80',
    }),
    {},
  )
})

test('returns a successful mock submission', async () => {
  const result = await submitAssignmentDraft(
    {
      title: 'Bài ghi thử nghiệm',
      classId: '10A1',
      dueAt: '2026-09-18T23:59',
      threshold: '80',
    },
    'success',
  )

  assert.equal(result.status, 'success')
  assert.equal(result.data.title, 'Bài ghi thử nghiệm')
})

test('returns a visible error snapshot for a failed mock submission', async () => {
  const result = await submitAssignmentDraft(
    {
      title: 'Bài ghi thử nghiệm',
      classId: '10A1',
      dueAt: '2026-09-18T23:59',
      threshold: '80',
    },
    'error',
  )

  assert.deepEqual(result, {
    status: 'error',
    message: 'Không thể tạo bài kiểm tra lúc này. Vui lòng thử lại.',
  })
})
