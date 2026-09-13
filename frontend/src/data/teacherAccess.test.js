import assert from 'node:assert/strict'
import test from 'node:test'

import { getStoredUsers } from './mockAuthStore.js'
import {
  canTeacherAccessClass,
  getTeacherClassesForUser,
} from './mockClassStore.js'
import { getClassDetailSnapshot } from './mockClassDetail.js'
import { getDashboardSnapshot } from './mockDashboard.js'

function createStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

test('returns only classes assigned to the current teacher', () => {
  const storage = createStorage()
  const teacher = getStoredUsers(storage).find((user) => user.id === 'teacher-ha')

  assert.deepEqual(
    getTeacherClassesForUser(teacher, storage).map((classroom) => classroom.id),
    ['10A1'],
  )
})

test('denies an unassigned class', () => {
  const storage = createStorage()
  const teacher = getStoredUsers(storage).find((user) => user.id === 'teacher-ha')

  assert.equal(canTeacherAccessClass(teacher, '10A2', storage), false)
  assert.equal(canTeacherAccessClass(teacher, '10A1', storage), true)
})

test('filters the teacher dashboard by the current user', () => {
  const storage = createStorage()
  const teacher = getStoredUsers(storage).find((user) => user.id === 'teacher-ha')

  const snapshot = getDashboardSnapshot('success', storage, teacher)

  assert.deepEqual(snapshot.data.map((classroom) => classroom.id), ['10A1'])
})

test('blocks a teacher from opening an unassigned class', () => {
  const storage = createStorage()
  const teacher = getStoredUsers(storage).find((user) => user.id === 'teacher-ha')

  const snapshot = getClassDetailSnapshot('10A2', storage, teacher)

  assert.equal(snapshot.status, 'error')
  assert.match(snapshot.message, /không được phân công/i)
})
