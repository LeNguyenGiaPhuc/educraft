import assert from 'node:assert/strict'
import test from 'node:test'

import { validateAccountPassword } from './accountPassword.js'

test('requires a password when creating an account', () => {
  assert.equal(validateAccountPassword('', { required: true }), 'Mật khẩu không được để trống.')
})

test('allows an empty password when editing an account', () => {
  assert.equal(validateAccountPassword('', { required: false }), '')
})

test('rejects a password shorter than six characters', () => {
  assert.equal(validateAccountPassword('12345', { required: false }), 'Mật khẩu phải có ít nhất 6 ký tự.')
})
