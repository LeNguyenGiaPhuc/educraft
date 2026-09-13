import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getClassMemberships,
  getStudentMemberships,
  saveClassMemberships,
  removeClassMembershipsForClass,
} from './mockClassMembershipStore.js'

function createStorage() {
  const values = new Map([
    ['educraft.users', JSON.stringify([
      {
        id: 'student-1',
        role: 'STUDENT',
        classIds: ['10A1'],
        studentCode: 'HS001',
        name: 'Nguyen Van A',
        email: 'a@example.com',
      },
    ])],
  ])

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

test('migrates class membership from the current user class ids', () => {
  const storage = createStorage()

  assert.deepEqual(getClassMemberships('10A1', storage), [
    { classId: '10A1', studentId: 'student-1', studentNumber: '' },
  ])
})

test('stores and updates the STT for one student in one class', () => {
  const storage = createStorage()

  saveClassMemberships('10A1', [
    { studentId: 'student-1', studentNumber: '07' },
  ], storage)

  assert.deepEqual(getClassMemberships('10A1', storage), [
    { classId: '10A1', studentId: 'student-1', studentNumber: '07' },
  ])
  assert.deepEqual(getStudentMemberships('student-1', storage), [
    { classId: '10A1', studentId: 'student-1', studentNumber: '07' },
  ])
})

test('removes memberships and class ids when a class is deleted', () => {
  const storage = createStorage()

  removeClassMembershipsForClass('10A1', storage)

  assert.deepEqual(getClassMemberships('10A1', storage), [])
  assert.deepEqual(JSON.parse(storage.getItem('educraft.users'))[0].classIds, [])
})
