import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createAiEvaluationController } from '../src/modules/ai-evaluations/aiEvaluationController.js'
import { createAiEvaluationRouter } from '../src/modules/ai-evaluations/aiEvaluationRoutes.js'

const frontendOrigin = 'http://localhost:5173'
const teacherId = '22222222-2222-4222-8222-222222222222'
const submissionId = '11111111-1111-4111-8111-111111111111'
const evaluation = {
  id: '99999999-9999-4999-8999-999999999999',
  submission_id: submissionId,
  coverage_score: 82,
  confidence: 0.84,
  suggested_status: 'REQUIRES_TEACHER_REVIEW',
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
    async runEvaluation() {
      return {
        submission_id: submissionId,
        submission_status: 'REQUIRES_REVIEW',
        evaluation,
      }
    },
    async getEvaluation() { return evaluation },
    ...overrides,
  }
}

function buildApp({ service = createService(), authenticate = authenticatedAs() } = {}) {
  const controller = createAiEvaluationController({ aiEvaluationService: service })
  const router = createAiEvaluationRouter({ controller, authenticate })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api', router)
    },
    logger: { error() {} },
  })
}

test('assigned teacher can trigger and read an AI evaluation', async () => {
  const created = await request(buildApp())
    .post(`/api/submissions/${submissionId}/ai-evaluation`)
    .set('Origin', frontendOrigin)
  const read = await request(buildApp())
    .get(`/api/submissions/${submissionId}/ai-evaluation`)

  assert.equal(created.status, 200)
  assert.equal(created.body.data.submission_status, 'REQUIRES_REVIEW')
  assert.equal(created.body.data.evaluation.id, evaluation.id)
  assert.equal(read.status, 200)
  assert.equal(read.body.data.id, evaluation.id)
})

test('AI routes reject unauthenticated and Student users', async () => {
  const unauthenticatedResponse = await request(buildApp({ authenticate: unauthenticated }))
    .get(`/api/submissions/${submissionId}/ai-evaluation`)
  const studentResponse = await request(buildApp({ authenticate: authenticatedAs('STUDENT') }))
    .post(`/api/submissions/${submissionId}/ai-evaluation`)
    .set('Origin', frontendOrigin)

  assert.equal(unauthenticatedResponse.status, 401)
  assert.equal(unauthenticatedResponse.body.error.code, 'AUTH_REQUIRED')
  assert.equal(studentResponse.status, 403)
  assert.equal(studentResponse.body.error.code, 'FORBIDDEN')
})

test('AI routes validate the submission UUID', async () => {
  const createResponse = await request(buildApp())
    .post('/api/submissions/not-an-id/ai-evaluation')
    .set('Origin', frontendOrigin)
  const readResponse = await request(buildApp())
    .get('/api/submissions/not-an-id/ai-evaluation')

  assert.equal(createResponse.status, 400)
  assert.equal(createResponse.body.error.code, 'VALIDATION_ERROR')
  assert.equal(readResponse.status, 400)
  assert.equal(
    readResponse.body.error.fields.submissionId,
    'ID lượt nộp bài không hợp lệ.',
  )
})

test('request-provided identities are not passed to the AI service', async () => {
  const calls = []
  const service = createService({
    async runEvaluation(...args) {
      calls.push(['create', ...args])
      return { submission_id: submissionId, evaluation }
    },
    async getEvaluation(...args) {
      calls.push(['get', ...args])
      return evaluation
    },
  })

  await request(buildApp({ service }))
    .post(`/api/submissions/${submissionId}/ai-evaluation`)
    .set('Origin', frontendOrigin)
    .send({ teacherId: 'other-teacher', studentId: 'other-student', classId: 'other-class' })
  await request(buildApp({ service }))
    .get(`/api/submissions/${submissionId}/ai-evaluation`)
    .query({ teacherId: 'other-teacher', student_id: 'other-student' })

  assert.deepEqual(calls.map(([operation, auth, id]) => ({
    operation,
    authenticatedId: auth.profile.id,
    id,
  })), [
    { operation: 'create', authenticatedId: teacherId, id: submissionId },
    { operation: 'get', authenticatedId: teacherId, id: submissionId },
  ])
  assert.equal(calls.every((call) => call.length === 3), true)
})

test('AI service failures use the shared safe error response', async () => {
  const safeFailure = await request(buildApp({
    service: createService({
      async runEvaluation() {
        throw new AppError(500, 'AI_EVALUATION_SAVE_FAILED', 'Không thể lưu đề xuất.')
      },
    }),
  }))
    .post(`/api/submissions/${submissionId}/ai-evaluation`)
    .set('Origin', frontendOrigin)
  const internalFailure = await request(buildApp({
    service: createService({
      async getEvaluation() { throw new Error('private Supabase detail') },
    }),
  }))
    .get(`/api/submissions/${submissionId}/ai-evaluation`)

  assert.equal(safeFailure.status, 500)
  assert.equal(safeFailure.body.error.code, 'AI_EVALUATION_SAVE_FAILED')
  assert.equal(internalFailure.status, 500)
  assert.deepEqual(internalFailure.body.error, {
    code: 'INTERNAL_ERROR',
    message: 'Hệ thống đang gặp lỗi.',
  })
})
