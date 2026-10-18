import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import {
  createAiUsageRecorder,
  createAiUsageService,
} from '../src/modules/ai-evaluations/aiUsageService.js'

const adminAuth = { profile: { id: 'admin-id', role: 'ADMIN', status: 'ACTIVE' } }

test('usage recorder stores safe interaction metadata without prompt content', async () => {
  const calls = []
  const adminClient = {
    from(table) {
      return {
        async insert(rows) {
          calls.push({ table, rows })
          return { error: null }
        },
      }
    },
  }
  const recorder = createAiUsageRecorder({ adminClient, logger: { error() {} } })

  await recorder.record({
    submissionId: '11111111-1111-4111-8111-111111111111',
    evaluationId: '99999999-9999-4999-8999-999999999999',
    interactions: [{
      stage: 'checker', status: 'SUCCEEDED', provider: 'gemini',
      model_name: 'gemini-test', prompt_version: 'checker-v1',
      input_tokens: 12, output_tokens: 4, latency_ms: 90, cost_usd: null,
      prompt: 'must never be stored',
    }],
  })

  assert.equal(calls[0].table, 'ai_usage_logs')
  assert.equal(Object.hasOwn(calls[0].rows[0], 'prompt'), false)
  assert.equal(calls[0].rows[0].submission_id, '11111111-1111-4111-8111-111111111111')
})

test('admin usage summary keeps unknown cost separate from zero cost', async () => {
  const adminClient = {
    async rpc(name) {
      assert.equal(name, 'get_ai_usage_summary')
      return { data: [{
        total_calls: 8, failed_calls: 2, refused_calls: 1,
        avg_latency_ms: 450, avg_cost_usd: null,
        priced_calls: 0, unpriced_calls: 8,
      }], error: null }
    },
  }
  const service = createAiUsageService({ adminClient })

  const result = await service.getSummary(adminAuth)

  assert.deepEqual(result, {
    total_calls: 8, failed_calls: 2, refused_calls: 1,
    avg_latency_ms: 450, avg_cost_usd: null,
    priced_calls: 0, unpriced_calls: 8,
  })
})

test('AI usage summary rejects non-admin users before database access', async () => {
  let called = false
  const service = createAiUsageService({
    adminClient: { async rpc() { called = true } },
  })

  await assert.rejects(
    service.getSummary({ profile: { role: 'TEACHER', status: 'ACTIVE' } }),
    (error) => error instanceof AppError && error.code === 'FORBIDDEN',
  )
  assert.equal(called, false)
})
