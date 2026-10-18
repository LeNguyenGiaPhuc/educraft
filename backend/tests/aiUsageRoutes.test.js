import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { createAiUsageController } from '../src/modules/ai-evaluations/aiUsageController.js'
import { createAiUsageRouter } from '../src/modules/ai-evaluations/aiUsageRoutes.js'

function authenticateAs(role) {
  return function authenticate(requestValue, _response, next) {
    requestValue.auth = {
      profile: { id: 'user-id', role, status: 'ACTIVE' },
    }
    next()
  }
}

function buildApp(role) {
  const service = {
    async getSummary() {
      return {
        total_calls: 4,
        failed_calls: 1,
        refused_calls: 0,
        avg_latency_ms: 250,
        avg_cost_usd: null,
        priced_calls: 0,
        unpriced_calls: 4,
      }
    },
  }
  const controller = createAiUsageController({ aiUsageService: service })
  const router = createAiUsageRouter({
    controller,
    authenticate: authenticateAs(role),
  })

  return createApp({
    frontendOrigin: 'http://localhost:5173',
    registerRoutes(app) { app.use('/api/admin', router) },
    logger: { error() {} },
  })
}

test('Admin can read the AI usage summary', async () => {
  const response = await request(buildApp('ADMIN')).get('/api/admin/ai-usage')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.total_calls, 4)
})

test('non-Admin users cannot read the AI usage summary', async () => {
  const response = await request(buildApp('TEACHER')).get('/api/admin/ai-usage')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})
