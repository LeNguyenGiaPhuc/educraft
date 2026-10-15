import test from 'node:test'
import assert from 'node:assert/strict'

import { getFinalReviewStatusLabel } from './submissionValidation.js'

test('final review status labels are consistently presented in Vietnamese', () => {
  assert.equal(getFinalReviewStatusLabel('completed'), 'Hoàn thành')
  assert.equal(getFinalReviewStatusLabel('needs_completion'), 'Cần bổ sung')
  assert.equal(getFinalReviewStatusLabel('requires_teacher_review'), 'Cần giáo viên xem lại')
  assert.equal(getFinalReviewStatusLabel('unknown'), 'Cần giáo viên xem lại')
})
