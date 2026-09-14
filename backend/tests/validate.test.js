import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'
import { z } from 'zod'

import { createApp } from '../src/app.js'
import { validate } from '../src/middleware/validate.js'

const schema = {
  body: z.object({ email: z.string().trim().toLowerCase().email() }),
}

test('validate exposes normalized data', async () => {
  const app = createApp({
    registerRoutes(expressApp) {
      expressApp.post('/api/example', validate(schema), (requestValue, response) => {
        response.json({ data: requestValue.validated.body })
      })
    },
  })
  const response = await request(app)
    .post('/api/example')
    .set('Origin', 'http://localhost:5173')
    .send({ email: '  STUDENT@EXAMPLE.COM ' })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.email, 'student@example.com')
})

test('validate returns field errors without running the handler', async () => {
  const app = createApp({
    registerRoutes(expressApp) {
      expressApp.post('/api/example', validate(schema), (requestValue, response) => {
        response.json({ data: requestValue.validated.body })
      })
    },
  })
  const response = await request(app)
    .post('/api/example')
    .set('Origin', 'http://localhost:5173')
    .send({ email: 'wrong' })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
  assert.ok(response.body.error.fields.email)
})
