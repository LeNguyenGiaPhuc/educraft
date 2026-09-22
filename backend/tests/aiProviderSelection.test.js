import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'

import { createAiProvider } from '../src/createDependencies.js'

test('dependency composition rejects an unsupported provider', () => {
  assert.throws(
    () => createAiProvider({ AI_PROVIDER: 'unsupported' }),
    /Unsupported AI provider/,
  )
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

test('dependency composition selects Ollama only when explicitly configured', async () => {
  const image = await sharp({
    create: { width: 4, height: 4, channels: 3, background: 'white' },
  }).png().toBuffer()
  const responses = [
    JSON.stringify({
      transcription: 'Mẫu và bài nộp',
      uncertain_content: [],
    }),
    JSON.stringify({
      transcription: 'Mẫu và bài nộp',
      uncertain_content: [],
    }),
    JSON.stringify({
      coverage_score: 80,
      confidence: 0.8,
      suggested_status: 'REQUIRES_TEACHER_REVIEW',
      missing_content: ['Bổ sung ý.'],
      feedback_draft: 'Cần giáo viên xem lại.',
    }),
  ]

  const provider = createAiProvider({
    AI_PROVIDER: 'ollama',
    OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    OLLAMA_MODEL: 'qwen3-vl:2b',
    AI_TIMEOUT_MS: 30000,
    OLLAMA_FETCH_IMPL: async () => ({
      ok: true,
      async json() {
        return { message: { content: responses.shift() } }
      },
    }),
  })

  const result = await provider.evaluate({
    assignmentTitle: 'Lực ma sát',
    coverageThreshold: 80,
    referenceImages: [{ mimeType: 'image/png', buffer: image, order: 1 }],
    submissionImages: [{ mimeType: 'image/png', buffer: image, order: 1 }],
  })

  assert.equal(result.provider, 'ollama')
})
