import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createAssignmentController } from '../src/modules/assignments/assignmentController.js'
import { createAssignmentRouter } from '../src/modules/assignments/assignmentRoutes.js'

const frontendOrigin = 'http://localhost:5173'
const teacherId = '22222222-2222-4222-8222-222222222222'
const classId = '11111111-1111-4111-8111-111111111111'
const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const assignment = {
  id: assignmentId,
  class_id: classId,
  created_by: teacherId,
  title: 'Bài ghi Nam Xương',
  due_at: '2026-09-18T23:59:00+07:00',
  coverage_threshold: 80,
  status: 'OPEN',
}

function authenticatedAs(role = 'TEACHER') {
  return function authenticate(requestValue, _response, next) {
    requestValue.auth = {
      profile: { id: teacherId, role },
      supabase: { userScoped: true },
    }
    next()
  }
}

function unauthenticated(_request, _response, next) {
  next(new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'))
}

function createService(overrides = {}) {
  return {
    async listAssignmentsForClass() { return [assignment] },
    async getAssignment() { return assignment },
    async createAssignment() { return assignment },
    async updateAssignment() { return assignment },
    async deleteAssignment() { return assignment },
    ...overrides,
  }
}

function buildAssignmentApp({ service = createService(), authenticate = authenticatedAs() } = {}) {
  const controller = createAssignmentController({ assignmentService: service })
  const router = createAssignmentRouter({ controller, authenticate })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api', router)
    },
    logger: { error() {} },
  })
}

test('teacher assignment CRUD endpoints return the shared response shapes', async () => {
  const app = buildAssignmentApp()
  const createBody = {
    title: assignment.title,
    due_at: assignment.due_at,
    coverage_threshold: 80,
    status: 'OPEN',
  }

  const listResponse = await request(app).get(`/api/classes/${classId}/assignments`)
  const getResponse = await request(app).get(`/api/assignments/${assignmentId}`)
  const createResponse = await request(app)
    .post(`/api/classes/${classId}/assignments`)
    .set('Origin', frontendOrigin)
    .send(createBody)
  const updateResponse = await request(app)
    .patch(`/api/assignments/${assignmentId}`)
    .set('Origin', frontendOrigin)
    .send({ title: 'Tên mới' })
  const deleteResponse = await request(app)
    .delete(`/api/assignments/${assignmentId}`)
    .set('Origin', frontendOrigin)

  assert.equal(listResponse.status, 200)
  assert.deepEqual(listResponse.body.data, [assignment])
  assert.equal(getResponse.status, 200)
  assert.equal(getResponse.body.data.id, assignmentId)
  assert.equal(createResponse.status, 201)
  assert.equal(createResponse.body.data.created_by, teacherId)
  assert.equal(updateResponse.status, 200)
  assert.equal(deleteResponse.status, 204)
})

test('controller passes request.auth to the service as the only teacher identity', async () => {
  let receivedAuth
  let receivedInput
  const service = createService({
    async createAssignment(auth, _classId, input) {
      receivedAuth = auth
      receivedInput = input
      return assignment
    },
  })
  const response = await request(buildAssignmentApp({ service }))
    .post(`/api/classes/${classId}/assignments`)
    .set('Origin', frontendOrigin)
    .send({
      title: assignment.title,
      due_at: assignment.due_at,
    })

  assert.equal(response.status, 201)
  assert.equal(receivedAuth.profile.id, teacherId)
  assert.equal(receivedAuth.supabase.userScoped, true)
  assert.equal(Object.hasOwn(receivedInput, 'created_by'), false)
  assert.equal(receivedInput.status, 'DRAFT')
  assert.equal(receivedInput.coverage_threshold, 80)
})

test('assignment routes reject unauthenticated and STUDENT requests', async () => {
  const unauthenticatedResponse = await request(buildAssignmentApp({ authenticate: unauthenticated }))
    .get(`/api/classes/${classId}/assignments`)
  const studentResponse = await request(buildAssignmentApp({ authenticate: authenticatedAs('STUDENT') }))
    .get(`/api/classes/${classId}/assignments`)

  assert.equal(unauthenticatedResponse.status, 401)
  assert.equal(unauthenticatedResponse.body.error.code, 'AUTH_REQUIRED')
  assert.equal(studentResponse.status, 403)
  assert.equal(studentResponse.body.error.code, 'FORBIDDEN')
})

test('assignment routes reject invalid and immutable request fields', async () => {
  const invalidBodies = [
    { due_at: assignment.due_at },
    { ...assignment, id: assignmentId },
    { title: assignment.title, due_at: assignment.due_at, coverage_threshold: 101 },
    { title: assignment.title, due_at: assignment.due_at, status: 'active' },
    { title: assignment.title, due_at: '2026-09-18T23:59:00' },
    { title: assignment.title, due_at: assignment.due_at, created_by: teacherId },
    { title: assignment.title, due_at: assignment.due_at, teacherId },
  ]

  for (const body of invalidBodies) {
    const response = await request(buildAssignmentApp())
      .post(`/api/classes/${classId}/assignments`)
      .set('Origin', frontendOrigin)
      .send(body)

    assert.equal(response.status, 400)
    assert.equal(response.body.error.code, 'VALIDATION_ERROR')
  }

  const updateResponse = await request(buildAssignmentApp())
    .patch(`/api/assignments/${assignmentId}`)
    .set('Origin', frontendOrigin)
    .send({ class_id: classId, created_by: teacherId })

  assert.equal(updateResponse.status, 400)
  assert.equal(updateResponse.body.error.code, 'VALIDATION_ERROR')
})

test('business and database failures use the shared error shape', async () => {
  const businessResponse = await request(buildAssignmentApp({
    service: createService({
      async updateAssignment() {
        throw new AppError(422, 'ASSIGNMENT_DEADLINE_REACHED', 'Deadline reached.')
      },
    }),
  }))
    .patch(`/api/assignments/${assignmentId}`)
    .set('Origin', frontendOrigin)
    .send({ status: 'OPEN' })

  const databaseResponse = await request(buildAssignmentApp({
    service: createService({
      async getAssignment() {
        throw new Error('database unavailable')
      },
    }),
  })).get(`/api/assignments/${assignmentId}`)

  assert.equal(businessResponse.status, 422)
  assert.equal(businessResponse.body.error.code, 'ASSIGNMENT_DEADLINE_REACHED')
  assert.equal(databaseResponse.status, 500)
  assert.deepEqual(databaseResponse.body.error, {
    code: 'INTERNAL_ERROR',
    message: 'Hệ thống đang gặp lỗi.',
  })
})
