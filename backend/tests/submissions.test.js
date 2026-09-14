import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createSubmissionController } from '../src/modules/submissions/submissionController.js'
import { createSubmissionRouter } from '../src/modules/submissions/submissionRoutes.js'
import {
  MAX_IMAGE_SIZE_BYTES,
  createRequiredImageUpload,
} from '../src/modules/storage/imageUpload.js'

const frontendOrigin = 'http://localhost:5173'
const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const studentId = '33333333-3333-4333-8333-333333333333'
const imageSignatures = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': Buffer.from('RIFF0000WEBP'),
}
const createdSubmission = {
  id: '11111111-1111-4111-8111-111111111111',
  assignment_id: assignmentId,
  student_id: studentId,
  attempt_number: 1,
  status: 'SUBMITTED',
}

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

function createService(overrides = {}) {
  return {
    async createSubmission() { return createdSubmission },
    ...overrides,
  }
}

function buildSubmissionApp({
  service = createService(),
  authenticate = authenticatedAs(),
} = {}) {
  const controller = createSubmissionController({ submissionService: service })
  const router = createSubmissionRouter({
    controller,
    authenticate,
    imageUpload: createRequiredImageUpload(),
  })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api', router)
    },
    logger: { error() {} },
  })
}

test('student submission endpoint accepts JPEG, PNG, and WebP', async () => {
  for (const [mimeType, buffer] of Object.entries(imageSignatures)) {
    const response = await request(buildSubmissionApp())
      .post(`/api/assignments/${assignmentId}/submissions`)
      .set('Origin', frontendOrigin)
      .attach('file', buffer, { filename: 'note.bin', contentType: mimeType })

    assert.equal(response.status, 201, mimeType)
    assert.equal(response.body.data.student_id, studentId)
    assert.equal(response.body.data.attempt_number, 1)
  }
})

test('submission endpoint rejects unauthenticated and TEACHER requests', async () => {
  const unauthenticatedResponse = await request(buildSubmissionApp({ authenticate: unauthenticated }))
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .attach('file', imageSignatures['image/png'], {
      filename: 'note.png',
      contentType: 'image/png',
    })
  const teacherResponse = await request(buildSubmissionApp({
    authenticate: authenticatedAs('TEACHER'),
  }))
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .attach('file', imageSignatures['image/png'], {
      filename: 'note.png',
      contentType: 'image/png',
    })

  assert.equal(unauthenticatedResponse.status, 401)
  assert.equal(unauthenticatedResponse.body.error.code, 'AUTH_REQUIRED')
  assert.equal(teacherResponse.status, 403)
  assert.equal(teacherResponse.body.error.code, 'FORBIDDEN')
})

test('submission endpoint validates assignment UUID before reading the file', async () => {
  const response = await request(buildSubmissionApp())
    .post('/api/assignments/not-an-id/submissions')
    .set('Origin', frontendOrigin)

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
  assert.equal(response.body.error.fields.assignmentId, 'ID bài kiểm tra không hợp lệ.')
})

test('submission endpoint rejects missing, invalid, and oversized files', async () => {
  const app = buildSubmissionApp()
  const missing = await request(app)
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
  const invalid = await request(app)
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .attach('file', Buffer.from('%PDF'), {
      filename: 'document.pdf',
      contentType: 'application/pdf',
    })
  const oversizedImage = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1)
  imageSignatures['image/png'].copy(oversizedImage)
  const oversized = await request(app)
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .attach('file', oversizedImage, {
      filename: 'large.png',
      contentType: 'image/png',
    })

  assert.equal(missing.status, 400)
  assert.equal(missing.body.error.code, 'IMAGE_REQUIRED')
  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.error.code, 'UNSUPPORTED_IMAGE_TYPE')
  assert.equal(oversized.status, 400)
  assert.equal(oversized.body.error.code, 'IMAGE_TOO_LARGE')
})

test('client identity and attempt fields are never passed to the service', async () => {
  let received
  const service = createService({
    async createSubmission(...args) {
      received = args
      return createdSubmission
    },
  })
  const response = await request(buildSubmissionApp({ service }))
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .field('studentId', 'client-student')
    .field('student_id', 'another-student')
    .field('attempt_number', '99')
    .field('submissionId', 'client-submission')
    .field('teacherId', 'client-teacher')
    .attach('file', imageSignatures['image/png'], {
      filename: 'note.png',
      contentType: 'image/png',
    })

  assert.equal(response.status, 201)
  assert.equal(received.length, 3)
  assert.equal(received[0].profile.id, studentId)
  assert.equal(received[1], assignmentId)
  assert.equal(received[2].originalname, 'note.png')
  assert.equal(received.some((value) => value === 'another-student'), false)
  assert.equal(received.some((value) => value === '99'), false)
})

test('safe service errors are returned while internal errors remain hidden', async () => {
  const unavailable = await request(buildSubmissionApp({
    service: createService({
      async createSubmission() {
        throw new AppError(409, 'ASSIGNMENT_EXPIRED', 'Đã hết hạn nộp bài.')
      },
    }),
  }))
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .attach('file', imageSignatures['image/png'], {
      filename: 'note.png',
      contentType: 'image/png',
    })
  const databaseFailure = await request(buildSubmissionApp({
    service: createService({
      async createSubmission() { throw new Error('database connection secret') },
    }),
  }))
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)
    .attach('file', imageSignatures['image/png'], {
      filename: 'note.png',
      contentType: 'image/png',
    })

  assert.equal(unavailable.status, 409)
  assert.equal(unavailable.body.error.code, 'ASSIGNMENT_EXPIRED')
  assert.equal(databaseFailure.status, 500)
  assert.deepEqual(databaseFailure.body.error, {
    code: 'INTERNAL_ERROR',
    message: 'Hệ thống đang gặp lỗi.',
  })
})
