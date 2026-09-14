import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'

test('unknown route returns the shared error shape and request ID', async () => {
  const response = await request(createApp()).get('/api/missing')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'NOT_FOUND')
  assert.ok(response.headers['x-request-id'])
})

test('AppError preserves status, code and fields', async () => {
  const app = createApp({
    registerRoutes(expressApp) {
      expressApp.get('/api/conflict', () => {
        throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng.', {
          email: 'Email đã được sử dụng.',
        })
      })
    },
  })
  const response = await request(app).get('/api/conflict')

  assert.equal(response.status, 409)
  assert.deepEqual(response.body.error.fields, {
    email: 'Email đã được sử dụng.',
  })
})

test('write request rejects an untrusted origin', async () => {
  const app = createApp({
    frontendOrigin: 'http://localhost:5173',
    registerRoutes(expressApp) {
      expressApp.post('/api/write', (_request, response) => {
        response.json({ data: { saved: true } })
      })
    },
  })
  const response = await request(app)
    .post('/api/write')
    .set('Origin', 'https://untrusted.example')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'INVALID_ORIGIN')
})
