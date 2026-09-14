import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { createAuthenticate } from '../src/middleware/authenticate.js'
import { requireRole } from '../src/middleware/authorize.js'

function fakeUserClient(profile) {
  return {
    from() {
      return {
        select() { return this },
        eq() { return this },
        async single() { return { data: profile, error: null } },
      }
    },
  }
}

function buildProtectedApp(profile) {
  const authClient = {
    auth: {
      async getUser(token) {
        return token === 'valid-token'
          ? { data: { user: { id: 'user-1' } }, error: null }
          : { data: { user: null }, error: new Error('invalid') }
      },
    },
  }
  const authenticate = createAuthenticate({
    authClient,
    createUserClient: () => fakeUserClient(profile),
  })

  return createApp({
    registerRoutes(expressApp) {
      expressApp.get(
        '/api/teacher-only',
        authenticate,
        requireRole('TEACHER'),
        (requestValue, response) => {
          response.json({ data: requestValue.auth.profile })
        },
      )
    },
  })
}

test('protected route rejects a missing access cookie', async () => {
  const response = await request(buildProtectedApp()).get('/api/teacher-only')

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTH_REQUIRED')
})

test('authentication rejects a locked profile', async () => {
  const response = await request(buildProtectedApp({
    id: 'user-1', role: 'TEACHER', status: 'LOCKED',
  }))
    .get('/api/teacher-only')
    .set('Cookie', 'educraft_access_token=valid-token')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'ACCOUNT_NOT_ACTIVE')
})

test('role middleware rejects a different active role', async () => {
  const response = await request(buildProtectedApp({
    id: 'user-1', role: 'STUDENT', status: 'ACTIVE',
  }))
    .get('/api/teacher-only')
    .set('Cookie', 'educraft_access_token=valid-token')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})

test('teacher reaches a teacher route with user-scoped context', async () => {
  const response = await request(buildProtectedApp({
    id: 'user-1', role: 'TEACHER', status: 'ACTIVE',
  }))
    .get('/api/teacher-only')
    .set('Cookie', 'educraft_access_token=valid-token')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.role, 'TEACHER')
})
