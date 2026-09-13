import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canAccessRole,
  DEFAULT_DEMO_ROLE,
  getMockUser,
  getRoleHome,
  readDemoRole,
  writeDemoRole,
} from './mockSession.js'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('starts the demo as the existing teacher', () => {
  assert.equal(DEFAULT_DEMO_ROLE, 'teacher')
  assert.deepEqual(getMockUser(), {
    id: 'mock-teacher-gp',
    role: 'teacher',
    studentId: null,
    name: 'Gia Phúc',
  })
})

test('provides the student identity matching the existing roster and submission page', () => {
  assert.deepEqual(getMockUser('student'), {
    id: 'mock-student-hs260101',
    role: 'student',
    studentId: 'HS260101',
    name: 'Nguyễn An Bình',
  })
})

test('allows matching roles and denies cross-role access', () => {
  const teacher = getMockUser('teacher')
  const student = getMockUser('student')

  assert.equal(canAccessRole(teacher, 'teacher'), true)
  assert.equal(canAccessRole(student, 'student'), true)
  assert.equal(canAccessRole(teacher, 'student'), false)
  assert.equal(canAccessRole(student, 'teacher'), false)
})

test('denies missing, unsupported, and incomplete identities', () => {
  const student = getMockUser('student')
  const invalidUsers = [
    null,
    undefined,
    {},
    { ...student, role: 'admin' },
    { ...student, id: '' },
    { ...student, name: '' },
    { ...student, studentId: null },
    { ...student, studentId: ' ' },
  ]

  for (const user of invalidUsers) {
    assert.equal(canAccessRole(user, 'student'), false)
    assert.equal(canAccessRole(user, 'teacher'), false)
    assert.equal(getRoleHome(user), null)
  }

  assert.equal(canAccessRole(student, 'admin'), false)
  assert.equal(getMockUser('admin'), null)
  assert.equal(getMockUser('toString'), null)
  assert.equal(getMockUser(null), null)
})

test('returns each supported role home for redirects and demo switching', () => {
  assert.equal(getRoleHome(getMockUser('teacher')), '/')
  assert.equal(getRoleHome(getMockUser('student')), '/student')
})

test('defaults a fresh browser session to teacher without writing a selection', () => {
  const storage = createMemoryStorage()

  assert.equal(readDemoRole(storage), 'teacher')
  assert.equal(storage.getItem('educraft.demoRole'), null)
})

test('stores only the selected role and restores it across session reads', () => {
  const writes = []
  const storage = createMemoryStorage()
  const recordingStorage = {
    getItem: storage.getItem,
    setItem(key, value) {
      writes.push([key, value])
      storage.setItem(key, value)
    },
  }

  assert.equal(writeDemoRole('student', recordingStorage), true)
  assert.equal(readDemoRole(storage), 'student')
  assert.equal(writeDemoRole('teacher', recordingStorage), true)
  assert.equal(readDemoRole(storage), 'teacher')
  assert.deepEqual(writes, [
    ['educraft.demoRole', 'student'],
    ['educraft.demoRole', 'teacher'],
  ])
})

test('falls back to teacher for invalid stored selections', () => {
  const storage = createMemoryStorage()

  for (const value of ['', 'admin', 'toString', '{"role":"student"}']) {
    storage.setItem('educraft.demoRole', value)
    assert.equal(readDemoRole(storage), 'teacher')
  }
})

test('rejects invalid role writes without replacing the existing selection', () => {
  const storage = createMemoryStorage()
  writeDemoRole('student', storage)

  for (const value of ['admin', '', null, undefined]) {
    assert.equal(writeDemoRole(value, storage), false)
    assert.equal(readDemoRole(storage), 'student')
  }
})

test('handles unavailable session storage and storage errors without throwing', () => {
  const failingStorage = {
    getItem() {
      throw new Error('Storage unavailable')
    },
    setItem() {
      throw new Error('Storage unavailable')
    },
  }

  assert.equal(readDemoRole(), 'teacher')
  assert.equal(readDemoRole(null), 'teacher')
  assert.equal(readDemoRole(failingStorage), 'teacher')
  assert.equal(writeDemoRole('student', null), false)
  assert.equal(writeDemoRole('student', failingStorage), false)
})
