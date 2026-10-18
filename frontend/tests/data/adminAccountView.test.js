import assert from 'node:assert/strict'
import test from 'node:test'

import { pageRegistry } from '../../src/data/adminRegistry.js'
import {
  filterAdminAccounts,
  getAccountClassLabel,
  normalizeAdminAccount,
  sortAdminAccounts,
} from '../../src/data/adminAccountView.js'

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

test('sorts loaded accounts without changing IDs or the default API order', () => {
  const accounts = [
    { id: 'account-3', name: 'Trần Bình', username: 'zeta' },
    { id: 'account-1', name: 'Đặng Ánh', username: 'beta' },
    { id: 'account-2', name: 'Đặng Ánh', username: 'alpha' },
  ]

  assert.deepEqual(sortAdminAccounts(accounts, 'default').map((row) => row.id), [
    'account-3',
    'account-1',
    'account-2',
  ])
  assert.deepEqual(sortAdminAccounts(accounts, 'name-asc').map((row) => row.id), [
    'account-1',
    'account-2',
    'account-3',
  ])
  assert.deepEqual(sortAdminAccounts(accounts, 'name-desc').map((row) => row.id), [
    'account-3',
    'account-1',
    'account-2',
  ])
  assert.deepEqual(sortAdminAccounts(accounts, 'username-asc').map((row) => row.id), [
    'account-2',
    'account-1',
    'account-3',
  ])
  assert.deepEqual(accounts.map((row) => row.id), ['account-3', 'account-1', 'account-2'])
})

test('filters before sorting and paginating 25 accounts', () => {
  const matching = Array.from({ length: 27 }, (_, index) => ({
    id: `student-${index}`,
    username: `student-${String(26 - index).padStart(2, '0')}`,
    name: `Đặng Ánh ${String(index).padStart(2, '0')}`,
    role: 'STUDENT',
    classes: [{ id: 'class-1' }],
  }))
  const loaded = [
    { id: 'teacher', username: 'teacher', name: 'Đặng Ánh', role: 'TEACHER', classes: [{ id: 'class-1' }] },
    ...matching,
    { id: 'other-class', username: 'student-x', name: 'Đặng Ánh', role: 'STUDENT', classes: [{ id: 'class-2' }] },
  ]

  const filtered = filterAdminAccounts(loaded, {
    query: 'DANG ANH',
    role: 'STUDENT',
    classId: 'class-1',
  })
  const sorted = sortAdminAccounts(filtered, 'username-asc')
  const page = pageRegistry(sorted, 1, 25)

  assert.equal(filtered.length, 27)
  assert.equal(page.items.length, 25)
  assert.equal(page.items[0].id, 'student-26')
  assert.equal(page.items[24].id, 'student-2')
  assert.equal(new Set(page.items.map((row) => row.id)).size, 25)
})
