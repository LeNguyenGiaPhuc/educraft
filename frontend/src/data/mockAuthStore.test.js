import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assignMockClass,
  activateMockAccount,
  deleteMockAccount,
  canAccessRole,
  createMockAccount,
  getCurrentUser,
  getRoleHome,
  getStoredUsers,
  loginWithMockCredentials,
  lockMockAccount,
  logoutMockUser,
  previewMockStudentImport,
  provisionMockStudentsForClass,
  ROLES,
  toggleMockAccountStatus,
  unlockMockAccount,
  updateMockAccount,
} from './mockAuthStore.js'
import { toggleAdminAccountStatus } from './mockAdminStore.js'
import { getClassStudents } from './mockStudentStore.js'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('logs in the three mock roles and maps each role to its home route', () => {
  const cases = [
    ['admin@educraft.test', 'admin123', ROLES.ADMIN, '/admin'],
    ['teacher@educraft.test', 'teacher123', ROLES.TEACHER, '/teacher'],
    ['student@educraft.test', 'student123', ROLES.STUDENT, '/student'],
  ]

  for (const [email, password, role, home] of cases) {
    const storage = createMemoryStorage()
    const result = loginWithMockCredentials(email, password, storage)

    assert.equal(result.status, 'success')
    assert.equal(result.data.role, role)
    assert.equal(getRoleHome(role), home)
  }
})

test('persists and clears the current mock session', () => {
  const storage = createMemoryStorage()

  loginWithMockCredentials('teacher@educraft.test', 'teacher123', storage)

  assert.equal(getCurrentUser(storage).email, 'teacher@educraft.test')

  logoutMockUser(storage)

  assert.equal(getCurrentUser(storage), null)
})

test('checks role access and blocks a locked account login', () => {
  const storage = createMemoryStorage()
  const users = getStoredUsers(storage)
  const student = users.find((user) => user.role === ROLES.STUDENT)

  assert.equal(canAccessRole(student, [ROLES.STUDENT]), true)
  assert.equal(canAccessRole(student, [ROLES.ADMIN]), false)

  toggleMockAccountStatus(student.id, storage)
  const result = loginWithMockCredentials('student@educraft.test', 'student123', storage)

  assert.equal(result.status, 'error')
  assert.match(result.message, /khoa/i)
})

test('creates, edits, and toggles a mock account', () => {
  const storage = createMemoryStorage()
  const created = createMockAccount(
    {
      name: 'Le Lan',
      email: 'lan@educraft.test',
      password: 'secret1',
      role: ROLES.STUDENT,
      classIds: ['10A1'],
      studentCode: 'HS260199',
    },
    storage,
  )

  assert.equal(created.status, 'success')
  assert.equal(created.data.role, ROLES.STUDENT)

  const updated = updateMockAccount(
    created.data.id,
    {
      name: 'Le Lan Anh',
      email: 'lan.anh@educraft.test',
      password: '',
      role: ROLES.TEACHER,
      classIds: ['10A2'],
    },
    storage,
  )

  assert.equal(updated.status, 'success')
  assert.equal(updated.data.name, 'Le Lan Anh')
  assert.equal(updated.data.role, ROLES.TEACHER)

  const toggled = toggleMockAccountStatus(created.data.id, storage)

  assert.equal(toggled.status, 'success')
  assert.equal(toggled.data.status, 'locked')
})

test('clears old class access when an account changes role', () => {
  const storage = createMemoryStorage()
  const created = createMockAccount({
    name: 'Le Lan',
    email: 'lan@example.com',
    password: 'secret1',
    role: ROLES.STUDENT,
    classIds: ['10A1'],
  }, storage).data

  const updated = updateMockAccount(created.id, {
    name: created.name,
    email: created.email,
    password: '',
    role: ROLES.TEACHER,
    classIds: ['10A2'],
  }, storage)

  assert.equal(updated.status, 'success')
  assert.deepEqual(getStoredUsers(storage).find((user) => user.id === created.id).classIds, [])
})

test('prevents an admin from locking the account that is currently logged in', () => {
  const storage = createMemoryStorage()
  const login = loginWithMockCredentials('admin@educraft.test', 'admin123', storage)

  assert.equal(login.status, 'success')

  const result = toggleAdminAccountStatus(login.data.id, login.data.id)

  assert.equal(result.status, 'error')
  assert.match(result.errors.form, /Không thể khóa tài khoản đang đăng nhập/i)

  const stored = getStoredUsers(storage).find((user) => user.id === login.data.id)
  assert.equal(stored.status, 'active')
})

test('assigns one teacher and selected students to a class', () => {
  const storage = createMemoryStorage()
  const teacher = createMockAccount(
    {
      name: 'Pham Teacher',
      email: 'pham.teacher@educraft.test',
      password: 'secret1',
      role: ROLES.TEACHER,
    },
    storage,
  ).data
  const student = createMockAccount(
    {
      name: 'Pham Student',
      email: 'pham.student@educraft.test',
      password: 'secret1',
      role: ROLES.STUDENT,
    },
    storage,
  ).data

  const result = assignMockClass('12B1', { teacherId: teacher.id, studentIds: [student.id] }, storage)
  const users = result.data

  assert.equal(result.status, 'success')
  assert.equal(users.find((user) => user.id === teacher.id).classIds.includes('12B1'), true)
  assert.equal(users.find((user) => user.id === student.id).classIds.includes('12B1'), true)
})

test('uses explicit account lock and unlock transitions', () => {
  const storage = createMemoryStorage()
  const student = getStoredUsers(storage).find((user) => user.id === 'student-binh')

  assert.equal(lockMockAccount(student.id, storage).data.status, 'locked')
  assert.equal(unlockMockAccount(student.id, storage).data.status, 'active')
  assert.equal(unlockMockAccount(student.id, storage).status, 'error')
})

test('previews and provisions new student accounts as pending without a password', () => {
  const storage = createMemoryStorage()
  const rows = [{ studentNumber: '01', name: 'Le Cẩm Chi', email: 'chi@example.com' }]

  const preview = previewMockStudentImport('10A1', rows, storage)
  assert.equal(preview.status, 'success')
  assert.deepEqual(preview.data.summary, {
    total: 1,
    newAccounts: 1,
    existingAccounts: 0,
    alreadyInClass: 0,
    errors: 0,
  })

  const result = provisionMockStudentsForClass('10A1', rows, storage)
  assert.equal(result.status, 'success')
  assert.equal(result.addedCount, 1)

  const student = getStoredUsers(storage).find((user) => user.email === 'chi@example.com')
  assert.equal(student.role, ROLES.STUDENT)
  assert.equal(student.status, 'pending')
  assert.equal(student.password, '')
  assert.deepEqual(student.classIds, ['10A1'])

  const login = loginWithMockCredentials('chi@example.com', 'anything', storage)
  assert.equal(login.status, 'error')
  assert.match(login.message, /chưa được kích hoạt/i)
})

test('keeps pending imported accounts out of the lock toggle until activation', () => {
  const storage = createMemoryStorage()
  const result = provisionMockStudentsForClass('10A1', [{
    studentNumber: '01',
    name: 'Le Cẩm Chi',
    email: 'chi@example.com',
  }], storage)
  const pending = result.data.addedEntries[0].accountId

  const blocked = toggleMockAccountStatus(pending, storage)
  assert.equal(blocked.status, 'error')

  const activated = activateMockAccount(pending, 'secret1', storage)
  assert.equal(activated.status, 'success')
  assert.equal(activated.data.status, 'active')
  assert.equal(loginWithMockCredentials('chi@example.com', 'secret1', storage).status, 'success')
})

test('deletes an account and its class memberships', () => {
  const storage = createMemoryStorage()
  const imported = provisionMockStudentsForClass('10A1', [{
    studentNumber: '01',
    name: 'Le Cẩm Chi',
    email: 'chi@example.com',
  }], storage)
  const studentId = imported.data.addedEntries[0].accountId

  const result = deleteMockAccount(studentId, storage)

  assert.equal(result.status, 'success')
  assert.equal(getStoredUsers(storage).some((user) => user.id === studentId), false)
  assert.equal(getClassStudents('10A1', [], storage).some((student) => student.id === studentId), false)
})

test('reuses matching student accounts, skips existing memberships, and blocks conflicts', () => {
  const storage = createMemoryStorage()

  const existing = createMockAccount({
    name: 'Le Cẩm Chi',
    email: 'chi@example.com',
    password: 'secret1',
    role: ROLES.STUDENT,
  }, storage).data

  const assigned = provisionMockStudentsForClass('10A1', [{
    studentNumber: '03',
    name: 'Lê Cẩm Chi',
    email: 'CHI@example.com',
  }], storage)
  assert.equal(assigned.status, 'success')
  assert.equal(assigned.assignedCount, 1)
  assert.deepEqual(getStoredUsers(storage).find((user) => user.id === existing.id).classIds, ['10A1'])

  const skipped = provisionMockStudentsForClass('10A1', [{
    studentNumber: '03',
    name: 'Lê Cẩm Chi',
    email: 'chi@example.com',
  }], storage)
  assert.equal(skipped.status, 'success')
  assert.equal(skipped.skippedCount, 1)

  const conflict = provisionMockStudentsForClass('10A1', [{
    studentNumber: '04',
    name: 'Người khác',
    email: 'chi@example.com',
  }], storage)
  assert.equal(conflict.status, 'error')
  assert.match(conflict.errors[0].message, /không khớp/i)
  assert.deepEqual(getStoredUsers(storage).find((user) => user.id === existing.id).classIds, ['10A1'])
})

test('keeps an imported student number per class', () => {
  const storage = createMemoryStorage()
  const rows = [{ studentNumber: '01', name: 'Le Cẩm Chi', email: 'chi@example.com' }]

  provisionMockStudentsForClass('10A1', rows, storage)
  provisionMockStudentsForClass('10A2', [{ ...rows[0], studentNumber: '09' }], storage)

  assert.equal(getClassStudents('10A1', [], storage).find((student) => student.email === 'chi@example.com').number, '01')
  assert.equal(getClassStudents('10A2', [], storage).find((student) => student.email === 'chi@example.com').number, '09')
})

test('does not write any account when one import row has a conflict', () => {
  const storage = createMemoryStorage()
  const before = getStoredUsers(storage)
  const result = provisionMockStudentsForClass('10A1', [
    { studentNumber: '01', name: 'Le Cẩm Chi', email: 'chi@example.com' },
    { studentNumber: '02', name: 'Admin giả', email: 'admin@educraft.test' },
  ], storage)

  assert.equal(result.status, 'error')
  assert.deepEqual(getStoredUsers(storage), before)
})

test('rejects an email that belongs to a non-student account', () => {
  const storage = createMemoryStorage()
  const result = provisionMockStudentsForClass('10A1', [{
    studentNumber: '01',
    name: 'Admin',
    email: 'admin@educraft.test',
  }], storage)

  assert.equal(result.status, 'error')
  assert.match(result.errors[0].message, /Quản trị/i)
})
