import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { createAuthController } from '../src/modules/auth/authController.js'
import { createAuthRouter } from '../src/modules/auth/authRoutes.js'

const profile = {
  id: 'user-1',
  email: 'teacher@educraft.test',
  full_name: 'Trần Gia Phúc',
  role: 'TEACHER',
  status: 'ACTIVE',
}

function buildAuthApp() {
  const authService = {
    async login() {
      return {
        profile,
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
      }
    },
    async refresh() {
      return {
        profile,
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      }
    },
    async logout() {},
  }
  const authenticate = (requestValue, response, next) => {
    requestValue.auth = { profile }
    next()
  }
  const controller = createAuthController({ authService, nodeEnv: 'test' })
  const router = createAuthRouter({ controller, authenticate })

  return createApp({
    registerRoutes(expressApp) {
      expressApp.use('/api/auth', router)
    },
  })
}

test('login sets HttpOnly cookies and returns profile only', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ email: 'TEACHER@EDUCRAFT.TEST', password: 'teacher123' })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.role, 'TEACHER')
  assert.equal(response.body.data.access_token, undefined)
  assert.match(response.headers['set-cookie'][0], /HttpOnly/)
  assert.equal(response.headers['cache-control'], 'private, no-store')
})

test('login rejects an invalid request body', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ email: 'wrong' })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
})

test('refresh rotates both cookies', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/refresh')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', 'educraft_refresh_token=old-refresh-token')

  assert.equal(response.status, 200)
  assert.equal(response.headers['set-cookie'].length, 2)
})

test('me returns the authenticated profile', async () => {
  const response = await request(buildAuthApp()).get('/api/auth/me')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, 'user-1')
})

test('logout clears authentication cookies', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/logout')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', 'educraft_access_token=access-token')

  assert.equal(response.status, 204)
  assert.match(response.headers['set-cookie'].join(';'), /Expires=Thu, 01 Jan 1970/)
})
