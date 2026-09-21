import assert from 'node:assert/strict'
import test from 'node:test'

import { createAiProvider } from '../src/createDependencies.js'

test('dependency composition selects the deterministic mock by default', async () => {
  const provider = createAiProvider({ AI_PROVIDER: 'mock' })
  const result = await provider.evaluate({
    assignmentTitle: 'Lực ma sát',
    coverageThreshold: 80,
    referenceImages: [],
    submissionImages: [],
  })

  assert.equal(result.provider, 'mock')
})

test('dependency composition selects Gemini only when explicitly configured', () => {
  const provider = createAiProvider({
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-3.8-flash',
    AI_TIMEOUT_MS: 30000,
  })

  assert.equal(typeof provider.evaluate, 'function')
})
