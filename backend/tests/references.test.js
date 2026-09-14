import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createReferenceController } from '../src/modules/assignments/referenceController.js'
import { createReferenceRouter } from '../src/modules/assignments/referenceRoutes.js'
import {
  MAX_IMAGE_SIZE_BYTES,
  createRequiredImageUpload,
} from '../src/modules/storage/imageUpload.js'

const frontendOrigin = 'http://localhost:5173'
const teacherId = '22222222-2222-4222-8222-222222222222'
const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const referenceId = '11111111-aaaa-4111-8111-111111111111'
const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const reference = {
  id: referenceId,
  assignment_id: assignmentId,
  storage_path: `${assignmentId}/generated.png`,
  original_filename: 'teacher-note.png',
  mime_type: 'image/png',
  size_bytes: image.length,
  uploaded_by: teacherId,
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
    async listReferences() { return [reference] },
    async uploadReference() { return reference },
    async replaceReference() { return reference },
    async deleteReference() { return reference },
    ...overrides,
  }
}

function buildReferenceApp({ service = createService(), authenticate = authenticatedAs() } = {}) {
  const controller = createReferenceController({ referenceService: service })
  const router = createReferenceRouter({
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

test('teacher reference endpoints list, append, replace, and delete', async () => {
  const app = buildReferenceApp()
  const listResponse = await request(app)
    .get(`/api/assignments/${assignmentId}/references`)
  const createResponse = await request(app)
    .post(`/api/assignments/${assignmentId}/references`)
    .set('Origin', frontendOrigin)
    .attach('file', image, { filename: 'reference.png', contentType: 'image/png' })
  const replaceResponse = await request(app)
    .put(`/api/assignments/${assignmentId}/references/${referenceId}`)
    .set('Origin', frontendOrigin)
    .attach('file', image, { filename: 'replacement.png', contentType: 'image/png' })
  const deleteResponse = await request(app)
    .delete(`/api/assignments/${assignmentId}/references/${referenceId}`)
    .set('Origin', frontendOrigin)

  assert.equal(listResponse.status, 200)
  assert.deepEqual(listResponse.body.data, [reference])
  assert.equal(createResponse.status, 201)
  assert.equal(createResponse.body.data.id, referenceId)
  assert.equal(replaceResponse.status, 200)
  assert.equal(replaceResponse.body.data.id, referenceId)
  assert.equal(deleteResponse.status, 204)
})

test('reference routes reject unauthenticated and STUDENT requests', async () => {
  const unauthenticatedResponse = await request(buildReferenceApp({ authenticate: unauthenticated }))
    .get(`/api/assignments/${assignmentId}/references`)
  const studentResponse = await request(buildReferenceApp({ authenticate: authenticatedAs('STUDENT') }))
    .get(`/api/assignments/${assignmentId}/references`)

  assert.equal(unauthenticatedResponse.status, 401)
  assert.equal(unauthenticatedResponse.body.error.code, 'AUTH_REQUIRED')
  assert.equal(studentResponse.status, 403)
  assert.equal(studentResponse.body.error.code, 'FORBIDDEN')
})

test('reference routes validate assignment and reference UUIDs before the controller', async () => {
  const invalidAssignment = await request(buildReferenceApp())
    .get('/api/assignments/not-an-id/references')
  const invalidReference = await request(buildReferenceApp())
    .delete(`/api/assignments/${assignmentId}/references/not-an-id`)
    .set('Origin', frontendOrigin)

  assert.equal(invalidAssignment.status, 400)
  assert.equal(invalidAssignment.body.error.code, 'VALIDATION_ERROR')
  assert.equal(invalidReference.status, 400)
  assert.equal(invalidReference.body.error.code, 'VALIDATION_ERROR')
})

test('reference upload route rejects missing, invalid, and oversized files', async () => {
  const app = buildReferenceApp()
  const missing = await request(app)
    .post(`/api/assignments/${assignmentId}/references`)
    .set('Origin', frontendOrigin)
  const invalid = await request(app)
    .post(`/api/assignments/${assignmentId}/references`)
    .set('Origin', frontendOrigin)
    .attach('file', Buffer.from('%PDF'), {
      filename: 'document.pdf',
      contentType: 'application/pdf',
    })
  const oversizedImage = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1)
  image.copy(oversizedImage)
  const oversized = await request(app)
    .post(`/api/assignments/${assignmentId}/references`)
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

test('multipart storage path fields are not passed as trusted service input', async () => {
  let received
  const service = createService({
    async uploadReference(...args) {
      received = args
      return reference
    },
  })
  const response = await request(buildReferenceApp({ service }))
    .post(`/api/assignments/${assignmentId}/references`)
    .set('Origin', frontendOrigin)
    .field('path', '../../client-chosen.png')
    .field('uploaded_by', 'another-teacher')
    .attach('file', image, { filename: 'reference.png', contentType: 'image/png' })

  assert.equal(response.status, 201)
  assert.equal(received.length, 3)
  assert.equal(received[0].profile.id, teacherId)
  assert.equal(received[1], assignmentId)
  assert.equal(received[2].originalname, 'reference.png')
  assert.equal(received.some((value) => value === '../../client-chosen.png'), false)
})
