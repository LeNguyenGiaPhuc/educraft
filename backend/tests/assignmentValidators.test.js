import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from '../src/modules/assignments/assignmentValidators.js'

const classId = '11111111-1111-4111-8111-111111111111'
const validBody = {
  title: 'Bài ghi Nam Xương',
  due_at: '2026-09-18T23:59:00+07:00',
  coverage_threshold: 80,
  status: 'OPEN',
}

test('create assignment validator accepts database-shaped input', () => {
  const result = createAssignmentSchema.body.safeParse(validBody)

  assert.equal(result.success, true)
  assert.deepEqual(result.data, validBody)
})

test('create assignment validator applies database defaults', () => {
  const result = createAssignmentSchema.body.safeParse({
    title: 'Bài nháp',
    due_at: '2026-09-18T16:59:00Z',
  })

  assert.equal(result.success, true)
  assert.equal(result.data.coverage_threshold, 80)
  assert.equal(result.data.status, 'DRAFT')
})

test('assignment validators reject invalid assignment fields', () => {
  const invalidBodies = [
    { ...validBody, title: '   ' },
    { ...validBody, coverage_threshold: -1 },
    { ...validBody, coverage_threshold: 101 },
    { ...validBody, status: 'active' },
    { ...validBody, due_at: 'not-a-date' },
    { ...validBody, due_at: '2026-09-18T23:59:00' },
  ]

  for (const body of invalidBodies) {
    assert.equal(createAssignmentSchema.body.safeParse(body).success, false)
  }
})

test('strict assignment bodies reject identity and immutable fields', () => {
  for (const forbiddenField of [
    'id',
    'class_id',
    'created_by',
    'teacherId',
    'created_at',
    'updated_at',
  ]) {
    const result = createAssignmentSchema.body.safeParse({
      ...validBody,
      [forbiddenField]: classId,
    })

    assert.equal(result.success, false, `${forbiddenField} should be rejected`)
  }
})

test('update validator accepts only editable fields and rejects empty updates', () => {
  assert.equal(updateAssignmentSchema.body.safeParse({ title: 'Tên mới' }).success, true)
  assert.equal(updateAssignmentSchema.body.safeParse({}).success, false)
  assert.equal(updateAssignmentSchema.body.safeParse({ class_id: classId }).success, false)
  assert.equal(updateAssignmentSchema.body.safeParse({ created_by: classId }).success, false)
})
