import assert from 'node:assert/strict'
import test from 'node:test'
import { aiUsageMetrics, mapAiUsage } from './adminDashboard.js'
import { createAiUsageService } from '../services/aiUsageService.js'

test('usage calls the agreed endpoint once per explicit load', async () => {
  const calls = []
  const service = createAiUsageService({ api: { async get(path) { calls.push(path); return { total_calls: 9 } } } })
  assert.deepEqual(await service.getSummary(), { total_calls: 9 })
  assert.deepEqual(calls, ['/api/admin/ai-usage'])
})

test('missing cost stays unknown and malformed numbers never render NaN or infinity', () => {
  for (const data of [{}, { total_calls: 8, priced_calls: 0, unpriced_calls: 8, avg_cost_usd: 0 },
    { total_calls: NaN, failed_calls: -1, refused_calls: '2', avg_latency_ms: Infinity }]) {
    const metrics = aiUsageMetrics(data)
    assert.equal(metrics.at(-1).value, 'Chưa có số liệu chi phí')
    assert.doesNotMatch(JSON.stringify(metrics), /NaN|Infinity|undefined/)
  }
  assert.equal(mapAiUsage({ priced_calls: 4, avg_cost_usd: null }).cost, null)
})

test('concurrent usage loads share one request but later loads can refresh', async () => {
  let requests = 0
  const service = createAiUsageService({ api: { async get() { requests += 1; return { total_calls: requests } } } })
  const first = service.getSummary()
  const second = service.getSummary()
  assert.equal(first, second)
  await Promise.all([first, second])
  assert.equal(requests, 1)
  assert.deepEqual(await service.getSummary(), { total_calls: 2 })
})

test('priced local calls can show zero while small real fees retain precision', () => {
  const zero = aiUsageMetrics({ priced_calls: 4, avg_cost_usd: 0 }).at(-1).value
  assert.match(zero, /0,00/)
  const small = aiUsageMetrics({ priced_calls: 4, avg_cost_usd: 0.000001 }).at(-1).value
  assert.match(small, /0,000001/)
  assert.equal(mapAiUsage({ total_calls: 12345, priced_calls: 100, unpriced_calls: 12245 }).total, 12345)
})
