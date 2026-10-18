import assert from 'node:assert/strict'
import test from 'node:test'
import { aiUsageMetrics, mapAiUsage } from '../../src/data/adminDashboard.js'
import { createAiUsageService } from '../../src/services/aiUsageService.js'

test('concurrent AI usage requests share one call; later calls can refresh', async () => {
  let calls = 0
  const service = createAiUsageService({ api: { async get(path) {
    assert.equal(path, '/api/admin/ai-usage'); calls++; return { total_calls: calls }
  } } })
  const first = service.getSummary(), second = service.getSummary()
  assert.equal(first, second)
  await Promise.all([first, second]); assert.equal(calls, 1)
  assert.deepEqual(await service.getSummary(), { total_calls: 2 })
})

test('missing or invalid cost is unknown, real zero cost and tiny fees are preserved', () => {
  for (const data of [null, {}, { priced_calls: 0, avg_cost_usd: 0 },
    { total_calls: NaN, failed_calls: -1, refused_calls: '2', avg_latency_ms: Infinity }]) {
    const metrics = aiUsageMetrics(data)
    assert.equal(metrics.at(-1).value, 'Chưa có số liệu chi phí')
    assert.doesNotMatch(JSON.stringify(metrics), /NaN|Infinity|undefined/)
  }
  assert.equal(mapAiUsage({ priced_calls: 4, avg_cost_usd: null }).cost, null)
  assert.match(aiUsageMetrics({ priced_calls: 4, avg_cost_usd: 0 }).at(-1).value, /0,00/)
  assert.match(aiUsageMetrics({ priced_calls: 4, avg_cost_usd: 0.000001 }).at(-1).value, /0,000001/)
})
