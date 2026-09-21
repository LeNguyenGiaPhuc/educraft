import assert from 'node:assert/strict'
import test from 'node:test'

import { loadEnv } from '../src/config/env.js'

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3100',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
}

test('loadEnv returns normalized config', () => {
  const config = loadEnv(validEnv)

  assert.equal(config.PORT, 3100)
  assert.equal(config.NODE_ENV, 'test')
  assert.equal(config.AI_PROVIDER, 'mock')
  assert.equal(config.GEMINI_MODEL, 'gemini-3.8-flash')
  assert.equal(config.OLLAMA_BASE_URL, 'http://127.0.0.1:11434')
  assert.equal(config.OLLAMA_MODEL, 'qwen3-vl:2b')
  assert.equal(config.OLLAMA_NUM_CTX, 4096)
  assert.equal(config.OLLAMA_NUM_PREDICT, 512)
  assert.equal(config.AI_TIMEOUT_MS, 30000)
  assert.equal(config.AI_MAX_REFERENCE_IMAGES, 4)
  assert.equal(config.AI_MAX_TOTAL_BYTES, 15 * 1024 * 1024)
})

test('loadEnv rejects a missing Supabase URL', () => {
  const missingUrl = { ...validEnv }
  delete missingUrl.SUPABASE_URL

  assert.throws(() => loadEnv(missingUrl), /SUPABASE_URL/)
})

test('loadEnv requires a Gemini key only when the Gemini provider is enabled', () => {
  assert.throws(
    () => loadEnv({ ...validEnv, AI_PROVIDER: 'gemini' }),
    /GEMINI_API_KEY/,
  )

  const config = loadEnv({
    ...validEnv,
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'demo-key',
  })

  assert.equal(config.AI_PROVIDER, 'gemini')
  assert.equal(config.GEMINI_API_KEY, 'demo-key')
})

test('loadEnv treats an empty Gemini key as absent in mock mode', () => {
  const config = loadEnv({ ...validEnv, GEMINI_API_KEY: '' })

  assert.equal(config.GEMINI_API_KEY, undefined)
})

test('loadEnv accepts Ollama without a Gemini key', () => {
  const config = loadEnv({
    ...validEnv,
    AI_PROVIDER: 'ollama',
    OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    OLLAMA_MODEL: 'qwen3-vl:2b',
  })

  assert.equal(config.AI_PROVIDER, 'ollama')
  assert.equal(config.OLLAMA_MODEL, 'qwen3-vl:2b')
})
