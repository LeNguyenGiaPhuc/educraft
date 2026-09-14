import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createStudentDashboardService } from '../src/modules/students/studentDashboardService.js'

const studentId = '11111111-1111-4111-8111-111111111111'
const classId = '22222222-2222-4222-8222-222222222222'
const assignmentId = '33333333-3333-4333-8333-333333333333'

function studentAuth(supabase) {
  return {
    profile: { id: studentId, role: 'STUDENT' },
    supabase,
  }
}

function createQuery(result) {
  const query = {
    select() { return query },
    eq() { return query },
    in() { return query },
    neq() { return query },
    order() { return query },
    maybeSingle() { return Promise.resolve(result) },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
  }

  return query
}

function createSupabase(results) {
  const tables = []
  const supabase = {
    from(table) {
      tables.push(table)
      return createQuery(results.shift())
    },
  }

  return { supabase, tables }
}

test('student dashboard groups enrolled classes and hides draft assignments', async () => {
  const { supabase, tables } = createSupabase([
    {
      data: [
        {
          class_id: classId,
          student_number: '01',
          classroom: {
            id: classId,
            code: '10A1',
            subject: 'Ngữ văn',
            semester: 'Học kỳ 1',
            school_year: '2026-2027',
            status: 'ACTIVE',
          },
        },
      ],
      error: null,
    },
    {
      data: [
        {
          id: assignmentId,
          class_id: classId,
          title: 'Bài kiểm tra mở',
          due_at: '2026-09-18T23:59:00+07:00',
          coverage_threshold: 80,
          status: 'OPEN',
        },
      ],
      error: null,
    },
  ])
  const service = createStudentDashboardService()

  const result = await service.getDashboard(studentAuth(supabase))

  assert.deepEqual(result, [
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
          title: 'Bài kiểm tra mở',
          due_at: '2026-09-18T23:59:00+07:00',
          coverage_threshold: 80,
          status: 'OPEN',
        },
      ],
    },
  ])
  assert.deepEqual(tables, ['class_members', 'assignments'])
})

test('student assignment read returns only an enrolled non-draft assignment', async () => {
  const { supabase } = createSupabase([
    {
      data: {
        id: assignmentId,
        class_id: classId,
        title: 'Bài kiểm tra mở',
        due_at: '2026-09-18T23:59:00+07:00',
        coverage_threshold: 80,
        status: 'OPEN',
        classroom: {
          id: classId,
          code: '10A1',
          subject: 'Ngữ văn',
          semester: 'Học kỳ 1',
          school_year: '2026-2027',
          status: 'ACTIVE',
        },
      },
      error: null,
    },
  ])
  const service = createStudentDashboardService()

  const result = await service.getAssignment(studentAuth(supabase), assignmentId)

  assert.equal(result.id, assignmentId)
  assert.equal(result.classroom.code, '10A1')
})

test('student dashboard service rejects non-student context', async () => {
  const service = createStudentDashboardService()

  await assert.rejects(
    service.getDashboard({ profile: { id: studentId, role: 'TEACHER' }, supabase: {} }),
    (error) => error instanceof AppError
      && error.status === 403
      && error.code === 'FORBIDDEN',
  )
})
