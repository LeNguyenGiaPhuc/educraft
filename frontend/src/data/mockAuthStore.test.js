import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assignMockClass,
  canAccessRole,
  createMockAccount,
  getCurrentUser,
  getRoleHome,
  getStoredUsers,
  loginWithMockCredentials,
  logoutMockUser,
  ROLES,
  toggleMockAccountStatus,
  updateMockAccount,
} from './mockAuthStore.js'
import { toggleAdminAccountStatus } from './mockAdminStore.js'

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
