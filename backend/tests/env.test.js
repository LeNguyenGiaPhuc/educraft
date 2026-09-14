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
})

test('loadEnv rejects a missing Supabase URL', () => {
  const missingUrl = { ...validEnv }
  delete missingUrl.SUPABASE_URL

  assert.throws(() => loadEnv(missingUrl), /SUPABASE_URL/)
})
