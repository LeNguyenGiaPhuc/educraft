import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatAssignmentDeadline,
  getAssignmentAvailability,
  toCanonicalDeadline,
} from './assignmentDeadline.js'
import { createStoredAssignment, getStoredAssignments } from './mockAssignmentStore.js'
import { getAssignmentSnapshot } from './mockClassDetail.js'

const dueAt = '2026-09-18T23:59:00+07:00'
const deadline = Date.parse('2026-09-18T16:59:00Z')

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

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

test('normalizes teacher datetime-local values to the school timezone', () => {
  assert.equal(toCanonicalDeadline('2026-09-18T23:59'), '2026-09-18T23:59+07:00')
  assert.equal(toCanonicalDeadline(dueAt), dueAt)
  assert.equal(toCanonicalDeadline('2026-02-30T23:59'), null)
  assert.equal(toCanonicalDeadline('18/09/2026, 23:59'), null)
})

test('formats student deadlines from the canonical value in the school timezone', () => {
  const assignment = { dueAt: '2026-09-18T16:59:00Z', dueDate: 'incorrect display value' }
  const formatted = formatAssignmentDeadline(assignment)
  assert.match(formatted, /23:59/)
  assert.match(formatted, /18\/9\/26/)
  assert.match(formatted, /UTC\+07:00/)
})

test('fixtures and newly stored assignments expose canonical deadlines without changing teacher display', () => {
  const storage = createMemoryStorage()
  assert.equal(getAssignmentSnapshot('nam-xuong', storage).data.dueAt, dueAt)
  const assignment = createStoredAssignment({
    classId: '10A1', title: 'New note', dueAt: '2026-09-18T23:59', threshold: '80',
  }, storage)
  assert.equal(assignment.dueDate, '18/09/2026, 23:59')
  assert.equal(assignment.dueAt, '2026-09-18T23:59+07:00')
  assert.equal(JSON.parse(storage.getItem('educraft.assignments'))[0].dueAt, assignment.dueAt)
  assert.equal(getStoredAssignments('10A1', storage)[0].dueAt, assignment.dueAt)
})

test('normalizes only known legacy display dates without rewriting storage or overriding dueAt', () => {
  const storage = createMemoryStorage()
  const records = [
    { id: 'legacy', classId: '10A1', dueDate: '18/09/2026, 23:59' },
    { id: 'invalid', classId: '10A1', dueDate: '30/02/2026, 23:59' },
    { id: 'ambiguous', classId: '10A1', dueDate: '09/18/2026' },
    { id: 'canonical', classId: '10A1', dueDate: '01/01/2000, 00:00', dueAt },
    { id: 'invalid-canonical', classId: '10A1', dueDate: '18/09/2026, 23:59', dueAt: null },
  ]
  storage.setItem('educraft.assignments', JSON.stringify(records))
  const assignments = getStoredAssignments('10A1', storage)
  assert.deepEqual(assignments.map((assignment) => assignment.dueAt), [
    '2026-09-18T23:59+07:00', null, null, dueAt, null,
  ])
  assert.equal(storage.getItem('educraft.assignments'), JSON.stringify(records))
})
