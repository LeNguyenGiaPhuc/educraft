import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createStudentDashboardController } from '../src/modules/students/studentDashboardController.js'
import { createStudentDashboardRouter } from '../src/modules/students/studentDashboardRoutes.js'

const frontendOrigin = 'http://localhost:5173'
const studentId = '11111111-1111-4111-8111-111111111111'
const assignmentId = '22222222-2222-4222-8222-222222222222'
const dashboard = [{ id: 'class-1', assignments: [] }]
const assignment = { id: assignmentId, title: 'Bài kiểm tra' }

function authenticatedAs(role = 'STUDENT') {
  return function authenticate(requestValue, _response, next) {
    requestValue.auth = {
      profile: { id: studentId, role },
      supabase: { userScoped: true },
    }
    next()
  }
}

function unauthenticated(_request, _response, next) {
  next(new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'))
}

function buildStudentApp({ service, authenticate = authenticatedAs() } = {}) {
  const studentService = service ?? {
    async getDashboard() { return dashboard },
    async getAssignment() { return assignment },
  }
  const controller = createStudentDashboardController({ studentService })
  const router = createStudentDashboardRouter({ controller, authenticate })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api/student', router)
    },
    logger: { error() {} },
  })
}

test('student dashboard endpoints return shared data envelopes', async () => {
  const dashboardResponse = await request(buildStudentApp()).get('/api/student/dashboard')
  const assignmentResponse = await request(buildStudentApp())
    .get(`/api/student/assignments/${assignmentId}`)

  assert.equal(dashboardResponse.status, 200)
  assert.deepEqual(dashboardResponse.body.data, dashboard)
  assert.equal(assignmentResponse.status, 200)
  assert.deepEqual(assignmentResponse.body.data, assignment)
})

test('student dashboard routes enforce authentication and role', async () => {
  const unauthenticatedResponse = await request(buildStudentApp({ authenticate: unauthenticated }))
    .get('/api/student/dashboard')
  const teacherResponse = await request(buildStudentApp({ authenticate: authenticatedAs('TEACHER') }))
    .get('/api/student/dashboard')

  assert.equal(unauthenticatedResponse.status, 401)
  assert.equal(unauthenticatedResponse.body.error.code, 'AUTH_REQUIRED')
  assert.equal(teacherResponse.status, 403)
  assert.equal(teacherResponse.body.error.code, 'FORBIDDEN')
})

test('student dashboard controller receives authenticated context and validated id', async () => {
  let receivedAuth
  let receivedAssignmentId
  const service = {
    async getDashboard(auth) {
      receivedAuth = auth
      return dashboard
    },
    async getAssignment(auth, id) {
      receivedAuth = auth
      receivedAssignmentId = id
      return assignment
    },
  }

  const response = await request(buildStudentApp({ service }))
    .get(`/api/student/assignments/${assignmentId}`)

  assert.equal(response.status, 200)
  assert.equal(receivedAuth.profile.id, studentId)
  assert.equal(receivedAuth.supabase.userScoped, true)
  assert.equal(receivedAssignmentId, assignmentId)
})

test('student assignment route rejects invalid UUIDs', async () => {
  const response = await request(buildStudentApp())
    .get('/api/student/assignments/not-an-id')

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
})
