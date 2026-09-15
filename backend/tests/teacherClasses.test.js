import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createTeacherClassController } from '../src/modules/classes/teacherClassController.js'
import { createTeacherClassRouter } from '../src/modules/classes/teacherClassRoutes.js'
import { createTeacherClassService } from '../src/modules/classes/teacherClassService.js'

const frontendOrigin = 'http://localhost:5173'
const teacherId = '11111111-1111-4111-8111-111111111111'
const classId = '22222222-2222-4222-8222-222222222222'

function teacherAuth(supabase) {
  return {
    profile: { id: teacherId, role: 'TEACHER', status: 'ACTIVE' },
    supabase,
  }
}

function createQuery(result) {
  const query = {
    select() { return query },
    eq() { return query },
    in() { return query },
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

function authenticatedAs(role = 'TEACHER') {
  return function authenticate(requestValue, _response, next) {
    requestValue.auth = {
      profile: { id: teacherId, role, status: 'ACTIVE' },
      supabase: { userScoped: true },
    }
    next()
  }
}

function buildApp({ service, authenticate = authenticatedAs() } = {}) {
  const controller = createTeacherClassController({ classService: service })
  const router = createTeacherClassRouter({ controller, authenticate })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api/teacher', router)
    },
    logger: { error() {} },
  })
}

test('teacher class service lists only assigned classes with counts', async () => {
  const classRow = {
    id: classId,
    code: '10A1',
    subject: 'Ngữ văn',
    semester: 'Học kỳ 1',
    school_year: '2026-2027',
    teacher_id: teacherId,
    status: 'ACTIVE',
  }
  const { supabase, tables } = createSupabase([
    { data: [classRow], error: null },
    { data: [{ class_id: classId }, { class_id: classId }], error: null },
    { data: [{ class_id: classId }], error: null },
  ])

  const result = await createTeacherClassService().listClasses(teacherAuth(supabase))

  assert.deepEqual(result, [{
    ...classRow,
    student_count: 2,
    assignment_count: 1,
  }])
  assert.deepEqual(tables, ['classes', 'class_members', 'assignments'])
})

test('teacher class service returns roster for an assigned class', async () => {
  const classRow = {
    id: classId,
    code: '10A1',
    subject: 'Ngữ văn',
    semester: 'Học kỳ 1',
    school_year: '2026-2027',
    teacher_id: teacherId,
    status: 'ACTIVE',
  }
  const rosterRow = {
    class_id: classId,
    student_id: '33333333-3333-4333-8333-333333333333',
    student_number: '01',
    joined_at: '2026-09-15T00:00:00.000Z',
    student: {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'student@example.com',
      username: 'student01',
      full_name: 'Nguyen Van A',
      role: 'STUDENT',
      status: 'ACTIVE',
      student_code: 'HS01',
    },
  }
  const { supabase, tables } = createSupabase([
    { data: classRow, error: null },
    { data: [rosterRow], error: null },
    { data: [{ class_id: classId }], error: null },
  ])

  const result = await createTeacherClassService().getClass(teacherAuth(supabase), classId)

  assert.deepEqual(result, {
    ...classRow,
    student_count: 1,
    assignment_count: 1,
    students: [{
      id: rosterRow.student_id,
      email: 'student@example.com',
      username: 'student01',
      full_name: 'Nguyen Van A',
      role: 'STUDENT',
      status: 'ACTIVE',
      student_code: 'HS01',
      class_id: classId,
      student_number: '01',
      joined_at: rosterRow.joined_at,
    }],
  })
  assert.deepEqual(tables, ['classes', 'class_members', 'assignments'])
})

test('teacher class service rejects a non-teacher context', async () => {
  await assert.rejects(
    createTeacherClassService().listClasses({
      profile: { id: teacherId, role: 'STUDENT', status: 'ACTIVE' },
      supabase: {},
    }),
    (error) => error instanceof AppError && error.status === 403 && error.code === 'FORBIDDEN',
  )
})

test('teacher class routes return class data and reject other roles', async () => {
  const service = {
    async listClasses() {
      return [{ id: classId, code: '10A1', student_count: 2, assignment_count: 1 }]
    },
    async getClass() {
      return { id: classId, code: '10A1', students: [] }
    },
  }

  const listResponse = await request(buildApp({ service }))
    .get('/api/teacher/classes')
    .set('Origin', frontendOrigin)
  const detailResponse = await request(buildApp({ service }))
    .get(`/api/teacher/classes/${classId}`)
    .set('Origin', frontendOrigin)
  const forbiddenResponse = await request(buildApp({
    service,
    authenticate: authenticatedAs('STUDENT'),
  })).get('/api/teacher/classes')

  assert.equal(listResponse.status, 200)
  assert.equal(listResponse.body.data[0].student_count, 2)
  assert.equal(detailResponse.status, 200)
  assert.deepEqual(detailResponse.body.data.students, [])
  assert.equal(forbiddenResponse.status, 403)
  assert.equal(forbiddenResponse.body.error.code, 'FORBIDDEN')
})
