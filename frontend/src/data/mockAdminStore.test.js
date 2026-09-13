import assert from 'node:assert/strict'
import test from 'node:test'

import { createMockAccount, ROLES } from './mockAuthStore.js'
import {
  createAdminClass,
  getAdminWorkspace,
  updateAdminClass,
} from './mockAdminStore.js'

function createStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

test('creates and edits a class with one active teacher assignment', () => {
  const storage = createStorage()
  const teacher = createMockAccount({
    name: 'Pham Teacher',
    email: 'teacher@example.com',
    password: 'secret1',
    role: ROLES.TEACHER,
  }, storage).data

  const created = createAdminClass({
    id: '12B1',
    name: 'Toán',
    semester: 'Học kỳ 2',
    schoolYear: 'Năm học 2026–2027',
    teacherId: teacher.id,
  }, storage)

  assert.equal(created.status, 'success')
  assert.equal(created.data.teacherId, teacher.id)

  const workspace = getAdminWorkspace('success', storage)
  assert.equal(workspace.data.classes.find((item) => item.id === '12B1').teacher.id, teacher.id)

  const updated = updateAdminClass('12B1', {
    name: 'Toán nâng cao',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2027–2028',
    teacherId: '',
  }, storage)

  assert.equal(updated.status, 'success')
  assert.equal(updated.data.name, 'Toán nâng cao 12B1')
  assert.equal(getAdminWorkspace('success', storage).data.classes.find((item) => item.id === '12B1').teacher, null)
})
