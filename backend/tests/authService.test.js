import assert from 'node:assert/strict'
import test from 'node:test'

import { createAuthService } from '../src/modules/auth/authService.js'

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
}

function buildService(profileResult, {
  oauthExchangeResult = {
    data: {
      user: { id: 'user-1', user_metadata: { role: 'ADMIN' } },
      session,
    },
    error: null,
  },
} = {}) {
  const selectedIds = []
  const revoked = []
  const oauthCalls = []
  const authClient = {
    auth: {
      async signInWithPassword() {
        return {
          data: { user: { id: 'user-1' }, session },
          error: null,
        }
      },
      async refreshSession() {
        return { data: {}, error: new Error('invalid refresh token') }
      },
    },
  }
  const adminClient = {
    auth: {
      admin: {
        async signOut(...args) {
          revoked.push(args)
          return { error: null }
        },
      },
    },
  }
  const createUserClient = () => ({
    from() {
      return {
        select() { return this },
        eq(_column, value) {
          selectedIds.push(value)
          return this
        },
        async single() { return profileResult },
      }
    },
  })
  const createOAuthClient = (storage) => ({
    auth: {
      async signInWithOAuth(credentials) {
        oauthCalls.push({ operation: 'start', credentials, storage })
        await storage.setItem('sb-test-auth-token-code-verifier', JSON.stringify('verifier'))
        return {
          data: { url: 'https://accounts.google.test/authorize' },
          error: null,
        }
      },
      async exchangeCodeForSession(code) {
        oauthCalls.push({ operation: 'exchange', code, storage })
        return oauthExchangeResult
      },
    },
  })

  return {
    service: createAuthService({
      authClient,
      adminClient,
      createOAuthClient,
      createUserClient,
      googleOAuthCallbackUrl: 'http://localhost:3000/api/auth/google/callback',
    }),
    oauthCalls,
    selectedIds,
    revoked,
  }
}

test('login loads the active profile belonging to the Auth user', async () => {
  const profile = { id: 'user-1', role: 'TEACHER', status: 'ACTIVE' }
  const context = buildService({ data: profile, error: null })

  const result = await context.service.login({
    email: 'teacher@educraft.test',
    password: 'teacher123',
  })

  assert.equal(result.profile, profile)
  assert.deepEqual(context.selectedIds, ['user-1'])
})

test('login revokes the new session when the profile is locked', async () => {
  const context = buildService({
    data: { id: 'user-1', role: 'TEACHER', status: 'LOCKED' },
    error: null,
  })

  await assert.rejects(
    context.service.login({ email: 'teacher@educraft.test', password: 'teacher123' }),
    (error) => error.code === 'ACCOUNT_NOT_ACTIVE',
  )
  assert.deepEqual(context.revoked, [['access-token', 'local']])
})

test('refresh returns INVALID_SESSION for an invalid refresh token', async () => {
  const context = buildService({ data: null, error: null })

  await assert.rejects(
    context.service.refresh('bad-refresh-token'),
    (error) => error.code === 'INVALID_SESSION',
  )
})

test('Google OAuth starts with PKCE and the configured backend callback', async () => {
  const context = buildService({ data: null, error: null })

  const result = await context.service.startGoogleLogin()

  assert.equal(result.url, 'https://accounts.google.test/authorize')
  assert.ok(result.state.includes('code-verifier'))
  assert.deepEqual(context.oauthCalls[0].credentials, {
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/api/auth/google/callback',
      skipBrowserRedirect: true,
    },
  })
})

test('Google callback uses the Auth UUID and returns role only from the active profile', async () => {
  const profile = { id: 'user-1', role: 'TEACHER', status: 'ACTIVE' }
  const context = buildService({ data: profile, error: null })
  const start = await context.service.startGoogleLogin()

  const result = await context.service.completeGoogleLogin('oauth-code', start.state)

  assert.equal(result.profile, profile)
  assert.equal(result.profile.role, 'TEACHER')
  assert.deepEqual(context.selectedIds, ['user-1'])
  assert.equal(context.oauthCalls.at(-1).code, 'oauth-code')
})

for (const [name, profileResult] of [
  ['missing', { data: null, error: { code: 'PGRST116' } }],
  ['PENDING', { data: { id: 'user-1', role: 'STUDENT', status: 'PENDING' }, error: null }],
  ['LOCKED', { data: { id: 'user-1', role: 'ADMIN', status: 'LOCKED' }, error: null }],
]) {
  test(`Google callback rejects a ${name} EduCraft profile and revokes its session`, async () => {
    const context = buildService(profileResult)
    const start = await context.service.startGoogleLogin()

    await assert.rejects(
      context.service.completeGoogleLogin('oauth-code', start.state),
      (error) => error.code === 'ACCOUNT_NOT_ACTIVE',
    )
    assert.deepEqual(context.revoked, [['access-token', 'local']])
  })
}

test('Google callback rejects invalid transaction state without creating authorization', async () => {
  const context = buildService({ data: { id: 'user-1', role: 'TEACHER', status: 'ACTIVE' }, error: null })

  await assert.rejects(
    context.service.completeGoogleLogin('oauth-code', 'invalid-state'),
    (error) => error.code === 'GOOGLE_OAUTH_FAILED',
  )
  assert.equal(context.oauthCalls.length, 0)
  assert.deepEqual(context.selectedIds, [])
})

test('Google callback maps provider exchange failure without reading a profile', async () => {
  const context = buildService(
    { data: { id: 'user-1', role: 'TEACHER', status: 'ACTIVE' }, error: null },
    { oauthExchangeResult: { data: { user: null, session: null }, error: new Error('provider failed') } },
  )
  const start = await context.service.startGoogleLogin()

  await assert.rejects(
    context.service.completeGoogleLogin('oauth-code', start.state),
    (error) => error.code === 'GOOGLE_OAUTH_FAILED',
  )
  assert.deepEqual(context.selectedIds, [])
  assert.deepEqual(context.revoked, [])
})
