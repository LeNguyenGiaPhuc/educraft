import assert from 'node:assert/strict'
import test from 'node:test'

import { createGoogleOAuthStorage } from '../src/modules/auth/googleOAuthState.js'

test('Google OAuth state serializes only PKCE verifier entries', async () => {
  const storage = createGoogleOAuthStorage()

  await storage.setItem('sb-project-auth-token-code-verifier', '"verifier"')
  await storage.setItem('sb-project-auth-token', '{"access_token":"must-not-persist"}')

  const serialized = storage.serialize()
  assert.match(serialized, /code-verifier/)
  assert.doesNotMatch(serialized, /access_token|must-not-persist/)
})

test('Google OAuth state rejects malformed, oversized, and non-PKCE cookie data', () => {
  for (const value of [
    'not-json',
    JSON.stringify({ session: 'token' }),
    JSON.stringify({ 'sb-code-verifier': 'x'.repeat(4097) }),
  ]) {
    assert.throws(() => createGoogleOAuthStorage(value), /OAuth state/i)
  }
})
