import assert from 'node:assert/strict'
import test from 'node:test'

import { createTeacherClassService } from './teacherClassService.js'

function fakeApi() {
  const calls = []
  return {
    calls,
    api: {
      get: async (path) => {
        calls.push(path)
        return path.endsWith('/classes')
          ? [{
              id: 'class-1',
              code: '10A1',
              subject: 'Ngữ văn',
              semester: 'Học kỳ 1',
              school_year: '2026-2027',
              status: 'ACTIVE',
              student_count: 2,
              assignment_count: 3,
            }]
          : {
              id: 'class-1',
              code: '10A1',
              subject: 'Ngữ văn',
              semester: 'Học kỳ 1',
              school_year: '2026-2027',
              status: 'ACTIVE',
              student_count: 1,
              assignment_count: 1,
              students: [{
                id: 'student-1',
                student_code: 'HS001',
                full_name: 'Nguyễn Văn A',
                student_number: '01',
                status: 'ACTIVE',
              }],
            }
      },
    },
  }
}

test('loads and maps teacher class list and detail responses', async () => {
  const { api, calls } = fakeApi()
  const classes = createTeacherClassService({ api })

  const list = await classes.listClasses()
  const detail = await classes.getClass('class/1')

  assert.deepEqual(calls, ['/api/teacher/classes', '/api/teacher/classes/class%2F1'])
  assert.deepEqual(list, [{
    id: 'class-1',
    code: '10A1',
    name: 'Ngữ văn 10A1',
    subject: 'Ngữ văn',
    semester: 'Học kỳ 1',
    schoolYear: '2026-2027',
    status: 'ACTIVE',
    studentCount: 2,
    assignmentCount: 3,
  }])
  assert.deepEqual(detail, {
    id: 'class-1',
    code: '10A1',
    name: 'Ngữ văn 10A1',
    subject: 'Ngữ văn',
    semester: 'Học kỳ 1',
    schoolYear: '2026-2027',
    status: 'ACTIVE',
    studentCount: 1,
    assignmentCount: 1,
    students: [{
      id: 'student-1',
      code: 'HS001',
      name: 'Nguyễn Văn A',
      number: '01',
      status: 'ACTIVE',
      latestSubmission: 'Chưa có dữ liệu',
    }],
  })
})
