import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { createAssignmentRouter } from '../src/modules/assignments/assignmentRoutes.js'
import { createReferenceRouter } from '../src/modules/assignments/referenceRoutes.js'
import { createSubmissionRouter } from '../src/modules/submissions/submissionRoutes.js'

const frontendOrigin = 'http://localhost:5173'
const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function authenticatedAs(role) {
  return function authenticate(requestValue, _response, next) {
    requestValue.auth = {
      profile: {
        id: role === 'STUDENT'
          ? '33333333-3333-4333-8333-333333333333'
          : '22222222-2222-4222-8222-222222222222',
        role,
      },
      supabase: { userScoped: true },
    }
    next()
  }
}

function send(marker, status = 200) {
  return function handler(_request, response) {
    response.status(status).json({ data: { marker } })
  }
}

function passImageUpload(requestValue, _response, next) {
  requestValue.file = { originalname: 'note.png' }
  next()
}

function buildComposedApp(role) {
  const authenticate = authenticatedAs(role)
  const assignmentRouter = createAssignmentRouter({
    authenticate,
    controller: {
      list: send('assignment-list'),
      create: send('assignment-create', 201),
      get: send('assignment-get'),
      update: send('assignment-update'),
      remove: send('assignment-remove'),
    },
  })
  const referenceRouter = createReferenceRouter({
    authenticate,
    imageUpload: passImageUpload,
    controller: {
      list: send('reference-list'),
      create: send('reference-create', 201),
      replace: send('reference-replace'),
      remove: send('reference-remove'),
    },
  })
  const submissionRouter = createSubmissionRouter({
    authenticate,
    imageUpload: passImageUpload,
    controller: {
      listOwn: send('submission-list-own'),
      listForTeacher: send('submission-list-teacher'),
      create: send('submission-create', 201),
      get: send('submission-get'),
      finalize: send('submission-finalize'),
    },
  })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api', assignmentRouter)
      expressApp.use('/api', referenceRouter)
      expressApp.use('/api', submissionRouter)
    },
    logger: { error() {} },
  })
}

test('Student history reaches the submission router through production route order', async () => {
  const response = await request(buildComposedApp('STUDENT'))
    .get(`/api/assignments/${assignmentId}/my-submissions`)

  assert.equal(response.status, 200)
  assert.equal(response.body.data.marker, 'submission-list-own')
})

test('Student submission reaches the submission router through production route order', async () => {
  const response = await request(buildComposedApp('STUDENT'))
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set('Origin', frontendOrigin)

  assert.equal(response.status, 201)
  assert.equal(response.body.data.marker, 'submission-create')
})

test('Teacher assignment endpoint remains reachable', async () => {
  const response = await request(buildComposedApp('TEACHER'))
    .get(`/api/assignments/${assignmentId}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.data.marker, 'assignment-get')
})

test('Student remains forbidden from a Teacher assignment endpoint', async () => {
  const response = await request(buildComposedApp('STUDENT'))
    .get(`/api/assignments/${assignmentId}`)

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})

test('Student remains forbidden from a Teacher reference endpoint', async () => {
  const response = await request(buildComposedApp('STUDENT'))
    .get(`/api/assignments/${assignmentId}/references`)

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})

test('unknown API route reaches normal 404 handling for a Student', async () => {
  const response = await request(buildComposedApp('STUDENT'))
    .get('/api/unrelated-resource')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'NOT_FOUND')
})
