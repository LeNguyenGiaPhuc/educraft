import assert from 'node:assert/strict'
import test from 'node:test'

import { createAdminClassService } from './adminClassService.js'

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

test('supports admin class CRUD, detail, list-students, teacher assignment, membership add/remove and import backend paths', async () => {
  const { api, calls } = fakeApi()
  const classes = createAdminClassService({ api })

  await classes.listClasses({ search: '10A1', status: 'ACTIVE' })
  await classes.getClass('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  await classes.listStudents('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  await classes.createClass({ code: '10A1', subject: 'Toán', semester: 'Học kỳ 1', school_year: '2026-2027', teacher_id: '33333333-3333-4333-8333-333333333333', status: 'ACTIVE' })
  await classes.updateClass('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { subject: 'Văn' })
  await classes.deleteClass('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  await classes.assignTeacher('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { teacher_id: '33333333-3333-4333-8333-333333333333' })
  await classes.addStudent('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { student_id: '66666666-6666-4666-8666-666666666666', student_number: '01' })
  await classes.removeStudent('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { student_id: '66666666-6666-4666-8666-666666666666' })
  await classes.importStudents('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { students: [{ studentNumber: '01', name: 'Nguyễn Văn A', email: 'student@example.com' }] })

  assert.deepEqual(calls, [
    {
      method: 'get',
      path: '/api/admin/classes?search=10A1&status=ACTIVE',
      body: undefined,
    },
    {
      method: 'get',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      body: undefined,
    },
    {
      method: 'get',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/students',
      body: undefined,
    },
    {
      method: 'post',
      path: '/api/admin/classes',
      body: { code: '10A1', subject: 'Toán', semester: 'Học kỳ 1', school_year: '2026-2027', teacher_id: '33333333-3333-4333-8333-333333333333', status: 'ACTIVE' },
    },
    {
      method: 'patch',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      body: { subject: 'Văn' },
    },
    {
      method: 'delete',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      body: undefined,
    },
    {
      method: 'post',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/teacher',
      body: { teacher_id: '33333333-3333-4333-8333-333333333333' },
    },
    {
      method: 'post',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/students',
      body: { student_id: '66666666-6666-4666-8666-666666666666', student_number: '01' },
    },
    {
      method: 'delete',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/students',
      body: { body: { student_id: '66666666-6666-4666-8666-666666666666' } },
    },
    {
      method: 'post',
      path: '/api/admin/classes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/import-students',
      body: { students: [{ studentNumber: '01', name: 'Nguyễn Văn A', email: 'student@example.com' }] },
    },
  ])
})
