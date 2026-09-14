import assert from 'node:assert/strict'
import test from 'node:test'

import { filterAdminAccounts, getAccountClassLabel, normalizeAdminAccount } from './adminAccountView.js'

test('normalizes and displays classes returned by the account API', () => {
  const account = normalizeAdminAccount({
    id: 'student-1',
    username: 'student01',
    full_name: 'Nguyen An',
    role: 'student',
    status: 'ACTIVE',
    classes: [{ id: 'class-1', code: '10A1' }],
  })

  assert.equal(account.role, 'STUDENT')
  assert.equal(account.status, 'active')
  assert.equal(getAccountClassLabel(account), '10A1')
})

test('filters accounts by class UUID instead of class code', () => {
  const accounts = [
    normalizeAdminAccount({ id: 'teacher-1', username: 'teacher01', role: 'TEACHER', classes: [{ id: 'class-1', code: '10A1' }] }),
    normalizeAdminAccount({ id: 'student-1', username: 'student01', role: 'STUDENT', classes: [] }),
  ]

  assert.deepEqual(
    filterAdminAccounts(accounts, { classId: 'class-1' }).map((account) => account.id),
    ['teacher-1'],
  )
})
