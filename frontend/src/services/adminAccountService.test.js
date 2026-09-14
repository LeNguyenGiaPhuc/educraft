import assert from 'node:assert/strict'
import test from 'node:test'

import { createAdminAccountService } from './adminAccountService.js'

function fakeApi() {
  const calls = []
  const api = {}

  for (const method of ['get', 'post', 'patch', 'delete']) {
    api[method] = async (path, body) => {
      calls.push({ method, path, body })
      return { method, path, body }
    }
  }

  return { api, calls }
}

test('supports admin account list/detail/create/update/lock/unlock/delete backend paths', async () => {
  const { api, calls } = fakeApi()
  const accounts = createAdminAccountService({ api })

  await accounts.listAccounts({ search: 'nguyen', role: 'STUDENT', status: 'ACTIVE' })
  await accounts.getAccount('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  await accounts.createAccount({ username: 'student_01', email: 'student@example.com' })
  await accounts.updateAccount('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { full_name: 'Updated Name' })
  await accounts.lockAccount('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  await accounts.unlockAccount('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  await accounts.deleteAccount('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

  assert.deepEqual(calls, [
    {
      method: 'get',
      path: '/api/admin/accounts?search=nguyen&role=STUDENT&status=ACTIVE',
      body: undefined,
    },
    {
      method: 'get',
      path: '/api/admin/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      body: undefined,
    },
    {
      method: 'post',
      path: '/api/admin/accounts',
      body: { username: 'student_01', email: 'student@example.com' },
    },
    {
      method: 'patch',
      path: '/api/admin/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      body: { full_name: 'Updated Name' },
    },
    {
      method: 'post',
      path: '/api/admin/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/lock',
      body: undefined,
    },
    {
      method: 'post',
      path: '/api/admin/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/unlock',
      body: undefined,
    },
    {
      method: 'delete',
      path: '/api/admin/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      body: undefined,
    },
  ])
})
