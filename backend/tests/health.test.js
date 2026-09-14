import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'

test('GET /api/health returns an ok response', async () => {
  const response = await request(createApp()).get('/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { data: { status: 'ok' } })
})
