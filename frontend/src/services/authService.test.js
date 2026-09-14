import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canAccessRole,
  createAuthService,
  getRoleHome,
  normalizeUser,
  ROLES,
} from './authService.js'

function profile(overrides = {}) {
  return {
    id: 'student-1',
    email: 'student@example.com',
    username: 'student01',
    full_name: 'Nguyễn Văn An',
    role: 'STUDENT',
    status: 'active',
    student_code: 'HS001',
    ...overrides,
  }
}

test('normalizes a backend profile to the shared frontend user shape', () => {
  assert.deepEqual(normalizeUser(profile()), {
    id: 'student-1',
    email: 'student@example.com',
    username: 'student01',
    name: 'Nguyễn Văn An',
    fullName: 'Nguyễn Văn An',
    role: ROLES.STUDENT,
    status: 'active',
    studentCode: 'HS001',
  })
})

test('calls the auth endpoints and returns normalized users', async () => {
  const calls = []
  const api = {
    post: async (path, body) => {
      calls.push({ method: 'post', path, body })
      return profile()
    },
    get: async (path) => {
      calls.push({ method: 'get', path })
      return profile({ role: 'TEACHER', student_code: null })
    },
  }
  const auth = createAuthService({ api })

  const loggedIn = await auth.login('student@example.com', 'secret')
  const current = await auth.me()
  await auth.logout()

  assert.equal(loggedIn.name, 'Nguyễn Văn An')
  assert.equal(current.role, ROLES.TEACHER)
  assert.deepEqual(calls, [
    {
      method: 'post',
      path: '/api/auth/login',
      body: { email: 'student@example.com', password: 'secret' },
    },
    { method: 'get', path: '/api/auth/me' },
    { method: 'post', path: '/api/auth/logout', body: undefined },
  ])
})

test('refreshes the session when the current session is unauthorized', async () => {
  const calls = []
  const api = {
    get: async (path) => {
      calls.push(path)
      const error = new Error('missing session')
      error.status = 401
      throw error
    },
    post: async (path) => {
      calls.push(path)
      if (path === '/api/auth/refresh') return profile()
      return undefined
    },
  }
  const auth = createAuthService({ api })

  const user = await auth.restoreSession()

  assert.equal(user.id, 'student-1')
  assert.deepEqual(calls, ['/api/auth/me', '/api/auth/refresh'])
})

test('returns no user when both session checks are unauthorized', async () => {
  const api = {
    get: async () => {
      const error = new Error('missing session')
      error.status = 401
      throw error
    },
    post: async () => {
      const error = new Error('invalid refresh')
      error.status = 401
      throw error
    },
  }
  const auth = createAuthService({ api })

  assert.equal(await auth.restoreSession(), null)
})

test('keeps role navigation and access checks independent from mock storage', () => {
  const user = normalizeUser(profile())

  assert.equal(getRoleHome(ROLES.STUDENT), '/student')
  assert.equal(getRoleHome(ROLES.TEACHER), '/teacher')
  assert.equal(canAccessRole(user, [ROLES.STUDENT]), true)
  assert.equal(canAccessRole(user, [ROLES.TEACHER]), false)
})
