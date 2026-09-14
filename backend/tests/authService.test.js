import assert from 'node:assert/strict'
import test from 'node:test'

import { createAuthService } from '../src/modules/auth/authService.js'

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
}

function buildService(profileResult) {
  const selectedIds = []
  const revoked = []
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

  return {
    service: createAuthService({ authClient, adminClient, createUserClient }),
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
