import assert from 'node:assert/strict'
import test from 'node:test'

import { createMockAiProvider } from '../src/modules/ai-evaluations/providers/mockAiProvider.js'
import { providerResultSchema } from '../src/modules/ai-evaluations/aiEvaluationSchema.js'

const input = {
  assignmentTitle: 'Lực ma sát',
  coverageThreshold: 80,
  referenceImages: [{ mimeType: 'image/jpeg', buffer: Buffer.from('reference'), order: 1 }],
  submissionImages: [{ mimeType: 'image/png', buffer: Buffer.from('submission'), order: 1 }],
}

test('mock provider returns a valid expanded result without mutating input', async () => {
  const provider = createMockAiProvider()
  const result = await provider.evaluate(input)

  assert.equal(providerResultSchema.safeParse(result).success, true)
  assert.equal(result.provider, 'mock')
  assert.equal(result.model_name, 'educraft-mock-evaluator')
  assert.equal(result.prompt_version, 'handwriting-v1')
  assert.equal(input.referenceImages[0].buffer.toString(), 'reference')
})

test('mock provider returns fresh uncertainty arrays for every evaluation', async () => {
  const provider = createMockAiProvider()
  const first = await provider.evaluate(input)
  const second = await provider.evaluate(input)

  first.uncertain_content.push({
    source: 'submission',
    page: 1,
    text: 'changed',
    reason: 'test',
  })

  assert.notEqual(first.uncertain_content, second.uncertain_content)
})
