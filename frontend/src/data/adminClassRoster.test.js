import assert from 'node:assert/strict'
import test from 'node:test'

import { getNextStudentNumber } from './adminClassRoster.js'

test('uses the first free student number instead of the current row count', () => {
  assert.equal(getNextStudentNumber([{ student_number: '1' }, { student_number: '3' }]), '2')
})

test('starts at one when the class has no numbered students', () => {
  assert.equal(getNextStudentNumber([]), '1')
})
