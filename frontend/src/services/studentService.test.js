import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createStudentService,
  mapStudentAssignment,
  mapStudentDashboard,
} from './studentService.js'

const classId = '22222222-2222-4222-8222-222222222222'
const assignmentId = '33333333-3333-4333-8333-333333333333'

test('maps dashboard classes and assignments to the student view model', () => {
  const result = mapStudentDashboard([
    {
      id: classId,
      code: '10A1',
      subject: 'Ngữ văn',
      semester: 'Học kỳ 1',
      school_year: '2026-2027',
      status: 'ACTIVE',
      student_number: '01',
      assignments: [
        {
          id: assignmentId,
          class_id: classId,
          title: 'Bài kiểm tra',
          due_at: '2026-09-18T23:59:00+07:00',
          status: 'OPEN',
        },
      ],
    },
  ])

  assert.equal(result[0].name, 'Ngữ văn 10A1')
  assert.equal(result[0].schoolYear, '2026-2027')
  assert.equal(result[0].assignments[0].classId, classId)
  assert.equal(result[0].assignments[0].classCode, '10A1')
  assert.equal(result[0].assignments[0].dueAt, '2026-09-18T23:59:00+07:00')
  assert.equal(result[0].assignments[0].statusTone, 'active')
})

test('maps a single student assignment with its classroom', () => {
  const result = mapStudentAssignment({
    id: assignmentId,
    class_id: classId,
    title: 'Bài kiểm tra',
    due_at: '2026-09-18T23:59:00+07:00',
    status: 'CLOSED',
    classroom: {
      id: classId,
      code: '10A1',
      subject: 'Ngữ văn',
      semester: 'Học kỳ 1',
      school_year: '2026-2027',
    },
  })

  assert.deepEqual(result.classroom, {
    id: classId,
    code: '10A1',
    name: 'Ngữ văn 10A1',
    subject: 'Ngữ văn',
    semester: 'Học kỳ 1',
    schoolYear: '2026-2027',
  })
  assert.equal(result.statusTone, 'closed')
})

test('student service calls dashboard and assignment endpoints', async () => {
  const calls = []
  const api = {
    async get(path) {
      calls.push(path)
      return path.endsWith('/dashboard') ? [] : { id: assignmentId }
    },
  }
  const service = createStudentService({ api })

  await service.getDashboard()
  await service.getAssignment(assignmentId)

  assert.deepEqual(calls, [
    '/api/student/dashboard',
    `/api/student/assignments/${assignmentId}`,
  ])
})
