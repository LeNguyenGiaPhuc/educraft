import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatAssignmentDeadline,
  getAssignmentAvailability,
  toAssignmentUpdateDeadline,
  toCanonicalDeadline,
  toTeacherDeadlineInput,
} from './assignmentDeadline.js'
const dueAt = '2026-09-18T23:59:00+07:00'
const deadline = Date.parse('2026-09-18T16:59:00Z')

test('uses the canonical instant and closes exactly at the deadline', () => {
  const assignment = { dueAt, dueDate: 'unrelated display text', statusTone: 'active' }
  assert.equal(getAssignmentAvailability(assignment, deadline - 1).isOpen, true)
  assert.equal(getAssignmentAvailability(assignment, deadline).isOpen, false)
  assert.equal(getAssignmentAvailability(assignment, deadline + 1).isOpen, false)
  assert.deepEqual(
    getAssignmentAvailability({ ...assignment, dueAt: '2026-09-18T16:59:00Z' }, deadline),
    getAssignmentAvailability(assignment, deadline),
  )
})

test('rejects missing, invalid, impossible, and timezone-free canonical deadlines', () => {
  for (const invalid of [undefined, null, '', 'invalid', '2026-09-18T23:59',
    '2026-02-30T23:59+07:00', '2026-09-18T24:00+07:00']) {
    const assignment = { dueAt: invalid, dueDate: '18/09/2026, 23:59' }
    assert.equal(getAssignmentAvailability(assignment, deadline - 1).isOpen, false)
    assert.equal(formatAssignmentDeadline(assignment), 'Chưa xác định')
  }
})

test('respects an explicitly closed assignment even before its deadline', () => {
  assert.equal(getAssignmentAvailability({ dueAt, statusTone: 'closed' }, deadline - 1).isOpen, false)
})

test('normalizes teacher datetime-local values to an API-compatible RFC 3339 deadline', () => {
  assert.equal(toCanonicalDeadline('2026-09-18T23:59'), '2026-09-18T23:59:00+07:00')
  assert.equal(toCanonicalDeadline(dueAt), dueAt)
  assert.equal(toCanonicalDeadline('2026-02-30T23:59'), null)
  assert.equal(toCanonicalDeadline('18/09/2026, 23:59'), null)
})

test('teacher edit keeps a server deadline at the same Vietnam time and instant', () => {
  const serverDeadline = '2026-09-17T13:00:00Z'
  const editValue = toTeacherDeadlineInput(serverDeadline)
  const unchangedPayload = toAssignmentUpdateDeadline(editValue, serverDeadline)

  assert.equal(editValue, '2026-09-17T20:00')
  assert.equal(unchangedPayload, serverDeadline)
  assert.equal(Date.parse(unchangedPayload), Date.parse(serverDeadline))
})

test('teacher edit converts an intentionally changed Vietnam deadline exactly once', () => {
  const changedPayload = toAssignmentUpdateDeadline(
    '2026-09-17T21:30',
    '2026-09-17T13:00:00Z',
  )

  assert.equal(changedPayload, '2026-09-17T21:30:00+07:00')
  assert.equal(Date.parse(changedPayload), Date.parse('2026-09-17T14:30:00Z'))
})

test('formats student deadlines from the canonical value in the school timezone', () => {
  const assignment = { dueAt: '2026-09-18T16:59:00Z', dueDate: 'incorrect display value' }
  const formatted = formatAssignmentDeadline(assignment)
  assert.match(formatted, /23:59/)
  assert.match(formatted, /18\/9\/26/)
  assert.match(formatted, /UTC\+07:00/)
})
