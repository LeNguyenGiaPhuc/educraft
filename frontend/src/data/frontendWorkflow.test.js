import assert from 'node:assert/strict'
import test from 'node:test'

import { getStoredUsers } from './mockAuthStore.js'
import { updateAdminClass } from './mockAdminStore.js'
import { getTeacherClassesForUser } from './mockClassStore.js'
import { getStudentDashboardSnapshot } from './mockStudentDashboard.js'

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

test('reassigning a class changes the teacher view immediately', () => {
  const storage = createStorage()
  const users = getStoredUsers(storage)
  const phuc = users.find((user) => user.id === 'teacher-phuc')
  const ha = users.find((user) => user.id === 'teacher-ha')

  const result = updateAdminClass('10A1', {
    name: 'Ngữ văn',
    semester: 'Học kỳ 1',
    schoolYear: 'Năm học 2026–2027',
    teacherId: ha.id,
  }, storage)

  assert.equal(result.status, 'success')
  assert.deepEqual(getTeacherClassesForUser(phuc, storage).map((item) => item.id), ['10A2', '11A1'])
  assert.deepEqual(getTeacherClassesForUser(ha, storage).map((item) => item.id), ['10A1'])
})

test('an enrolled student sees only their class', () => {
  const storage = createStorage()
  const student = getStoredUsers(storage).find((user) => user.id === 'student-binh')
  const currentStudent = { ...student, role: 'student', studentId: student.studentCode }

  assert.deepEqual(getStudentDashboardSnapshot(currentStudent, storage).data.map((item) => item.id), ['10A1'])
})
