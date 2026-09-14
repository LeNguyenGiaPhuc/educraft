import assert from 'node:assert/strict'
import test from 'node:test'

import { createSupabaseGateway } from '../src/config/supabase.js'

const config = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
}

test('gateway uses the user token only for the user-scoped client', () => {
  const calls = []
  const fakeCreateClient = (url, key, options) => {
    calls.push({ url, key, options })
    return { url, key, options }
  }
  const gateway = createSupabaseGateway(config, fakeCreateClient)

  gateway.createUserClient('user-token')

  assert.equal(calls[0].key, 'anon-key')
  assert.equal(calls[1].key, 'service-key')
  assert.equal(calls[2].key, 'anon-key')
  assert.equal(calls[2].options.global.headers.Authorization, 'Bearer user-token')
})

test('gateway rejects an empty user token', () => {
  const gateway = createSupabaseGateway(config, () => ({}))

  assert.throws(() => gateway.createUserClient(''), /access token/i)
})
