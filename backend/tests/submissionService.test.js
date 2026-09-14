import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createSubmissionService } from '../src/modules/submissions/submissionService.js'

const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const studentId = '33333333-3333-4333-8333-333333333333'
const submissionIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '44444444-4444-4444-8444-444444444444',
]
const image = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  mimetype: 'image/png',
  originalname: 'student-note.png',
  size: 8,
}

function submission(attemptNumber) {
  return {
    id: submissionIds[attemptNumber - 1],
    assignment_id: assignmentId,
    student_id: studentId,
    attempt_number: attemptNumber,
    status: 'SUBMITTED',
    submitted_at: `2026-09-14T00:00:0${attemptNumber}Z`,
  }
}

function uploaded(submissionId) {
  return {
    bucket: 'student-submissions',
    path: `${submissionId}/generated.png`,
    fullPath: `student-submissions/${submissionId}/generated.png`,
    fileName: 'generated.png',
    originalFilename: image.originalname,
    mimeType: image.mimetype,
    sizeBytes: image.size,
  }
}

function metadata(submissionId) {
  return {
    id: `file-${submissionId}`,
    submission_id: submissionId,
    storage_path: `${submissionId}/generated.png`,
    original_filename: image.originalname,
    mime_type: image.mimetype,
    size_bytes: image.size,
    page_order: 1,
  }
}

function createUserClient({ rpcResults = [], metadataResults = [] } = {}) {
  return {
    rpcCalls: [],
    metadataWrites: [],
    async rpc(name, input) {
      this.rpcCalls.push({ name, input })
      return rpcResults.shift()
    },
    from(table) {
      assert.equal(table, 'submission_files')
      const client = this
      const builder = {
        insert(value) {
          client.metadataWrites.push(value)
          return builder
        },
        select() { return builder },
        async single() { return metadataResults.shift() },
      }
      return builder
    },
  }
}

function createAdminClient({ errors = [] } = {}) {
  return {
    deleteCalls: [],
    from(table) {
      assert.equal(table, 'submissions')
      const client = this
      return {
        delete() { return this },
        async eq(column, value) {
          client.deleteCalls.push({ column, value })
          return { error: errors.shift() ?? null }
        },
      }
    },
  }
}

function createStorageService({ uploadError = null, rollbackError = null } = {}) {
  return {
    uploadCalls: [],
    rollbackCalls: [],
    async uploadSubmissionFile(input) {
      this.uploadCalls.push(input)
      if (uploadError) throw uploadError
      return uploaded(input.submissionId)
    },
    async rollbackUploadedFile(input) {
      this.rollbackCalls.push(input)
      if (rollbackError) throw rollbackError
      return input
    },
  }
}

function studentAuth(supabase, overrides = {}) {
  return {
    profile: { id: studentId, role: 'STUDENT', ...overrides },
    supabase,
  }
}

function buildService(options = {}) {
  const adminClient = options.adminClient ?? createAdminClient()
  const storageService = options.storageService ?? createStorageService()
  const logger = options.logger ?? { error() {} }
  return {
    adminClient,
    storageService,
    service: createSubmissionService({ adminClient, storageService, logger }),
  }
}

test('three submissions use RPC attempts 1, 2, and 3 and preserve separate records', async () => {
  const attempts = [1, 2, 3]
  const supabase = createUserClient({
    rpcResults: attempts.map((number) => ({ data: submission(number), error: null })),
    metadataResults: attempts.map((number) => ({
      data: metadata(submissionIds[number - 1]),
      error: null,
    })),
  })
  const { service, storageService, adminClient } = buildService()

  const results = []
  for (let index = 0; index < attempts.length; index += 1) {
    results.push(await service.createSubmission(studentAuth(supabase), assignmentId, image))
  }

  assert.deepEqual(results.map((result) => result.attempt_number), attempts)
  assert.equal(new Set(results.map((result) => result.id)).size, 3)
  assert.deepEqual(supabase.rpcCalls, attempts.map(() => ({
    name: 'create_submission_attempt',
    input: { target_assignment_id: assignmentId },
  })))
  assert.deepEqual(storageService.uploadCalls.map((call) => call.submissionId), submissionIds)
  assert.deepEqual(supabase.metadataWrites, submissionIds.map((id) => ({
    submission_id: id,
    storage_path: `${id}/generated.png`,
    original_filename: image.originalname,
    mime_type: image.mimetype,
    size_bytes: image.size,
    page_order: 1,
  })))
  assert.equal(adminClient.deleteCalls.length, 0)
})

test('student identity and attempt number come only from the authenticated RPC result', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: [submission(1)], error: null }],
    metadataResults: [{ data: metadata(submissionIds[0]), error: null }],
  })
  const { service } = buildService()

  const result = await service.createSubmission(studentAuth(supabase), assignmentId, image)

  assert.equal(result.student_id, studentId)
  assert.equal(result.attempt_number, 1)
  assert.deepEqual(supabase.rpcCalls[0].input, { target_assignment_id: assignmentId })
})

test('service rejects a non-student context before calling Supabase', async () => {
  const supabase = createUserClient()
  const { service } = buildService()

  await assert.rejects(
    service.createSubmission(studentAuth(supabase, { role: 'TEACHER' }), assignmentId, image),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  )
  assert.equal(supabase.rpcCalls.length, 0)
})

test('RPC failures for another class and unavailable assignments map to safe errors', async (context) => {
  const cases = [
    ['STUDENT_NOT_ENROLLED', 403, 'CLASS_MEMBERSHIP_REQUIRED'],
    ['ASSIGNMENT_DRAFT', 409, 'ASSIGNMENT_DRAFT'],
    ['ASSIGNMENT_CLOSED', 409, 'ASSIGNMENT_CLOSED'],
    ['ASSIGNMENT_EXPIRED', 409, 'ASSIGNMENT_EXPIRED'],
    ['ASSIGNMENT_NOT_FOUND', 404, 'ASSIGNMENT_NOT_FOUND'],
  ]

  for (const [rpcMessage, status, code] of cases) {
    await context.test(rpcMessage, async () => {
      const supabase = createUserClient({
        rpcResults: [{ data: null, error: { code: 'P0001', message: rpcMessage } }],
      })
      const { service, storageService } = buildService()

      await assert.rejects(
        service.createSubmission(studentAuth(supabase), assignmentId, image),
        (error) => error.status === status && error.code === code,
      )
      assert.equal(storageService.uploadCalls.length, 0)
    })
  }
})

test('an unknown RPC failure is hidden behind a stable database error', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: null, error: { code: 'XX000', message: 'secret database detail' } }],
  })
  const { service } = buildService()

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.status === 500
      && error.code === 'SUBMISSION_CREATE_FAILED'
      && !error.message.includes('secret'),
  )
})

test('a thrown RPC transport failure is mapped without leaking details', async () => {
  const supabase = createUserClient()
  supabase.rpc = async () => { throw new Error('transport secret') }
  const { service } = buildService()

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.code === 'SUBMISSION_CREATE_FAILED'
      && !error.message.includes('secret'),
  )
})

test('upload failure deletes only the just-created temporary submission', async () => {
  const storageError = new AppError(500, 'STORAGE_UPLOAD_FAILED', 'Không thể lưu file ảnh.')
  const supabase = createUserClient({
    rpcResults: [{ data: submission(3), error: null }],
  })
  const storageService = createStorageService({ uploadError: storageError })
  const { service, adminClient } = buildService({ storageService })

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    storageError,
  )
  assert.deepEqual(adminClient.deleteCalls, [
    { column: 'id', value: submissionIds[2] },
  ])
  assert.equal(supabase.metadataWrites.length, 0)
})

test('a thrown upload failure is mapped safely and rolls back the new row', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: submission(1), error: null }],
  })
  const storageService = createStorageService({
    uploadError: new Error('storage transport secret'),
  })
  const { service, adminClient } = buildService({ storageService })

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.code === 'STORAGE_UPLOAD_FAILED'
      && !error.message.includes('secret'),
  )
  assert.deepEqual(adminClient.deleteCalls, [
    { column: 'id', value: submissionIds[0] },
  ])
})

test('metadata failure removes the uploaded object and temporary submission', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: submission(2), error: null }],
    metadataResults: [{ data: null, error: new Error('private metadata detail') }],
  })
  const { service, storageService, adminClient } = buildService()

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.code === 'SUBMISSION_FILE_METADATA_FAILED'
      && !error.message.includes('private'),
  )
  assert.deepEqual(storageService.rollbackCalls, [uploaded(submissionIds[1])])
  assert.deepEqual(adminClient.deleteCalls, [
    { column: 'id', value: submissionIds[1] },
  ])
})

test('thrown metadata transport failure also performs complete compensation', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: submission(1), error: null }],
  })
  supabase.from = () => ({
    insert() { return this },
    select() { return this },
    async single() { throw new Error('metadata transport secret') },
  })
  const { service, storageService, adminClient } = buildService()

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.code === 'SUBMISSION_FILE_METADATA_FAILED'
      && !error.message.includes('secret'),
  )
  assert.deepEqual(storageService.rollbackCalls, [uploaded(submissionIds[0])])
  assert.deepEqual(adminClient.deleteCalls, [
    { column: 'id', value: submissionIds[0] },
  ])
})

test('rollback failure is logged without secrets and surfaced explicitly', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: submission(1), error: null }],
    metadataResults: [{ data: null, error: new Error('metadata secret') }],
  })
  const storageService = createStorageService({
    rollbackError: { code: 'STORAGE_REMOVE_FAILED', message: 'storage secret' },
  })
  const logger = { entries: [], error(entry) { this.entries.push(entry) } }
  const { service, adminClient } = buildService({ storageService, logger })

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.code === 'SUBMISSION_ROLLBACK_FAILED',
  )
  assert.equal(adminClient.deleteCalls.length, 1)
  assert.deepEqual(logger.entries, [{
    event: 'submission_file_rollback_failed',
    submissionId: submissionIds[0],
    bucket: 'student-submissions',
    path: `${submissionIds[0]}/generated.png`,
    errorCode: 'STORAGE_REMOVE_FAILED',
  }])
  assert.equal(JSON.stringify(logger.entries).includes('secret'), false)
})

test('row rollback failure is logged and does not claim upload cleanup succeeded', async () => {
  const supabase = createUserClient({
    rpcResults: [{ data: submission(1), error: null }],
  })
  const storageService = createStorageService({
    uploadError: new AppError(500, 'STORAGE_UPLOAD_FAILED', 'Upload failed'),
  })
  const adminClient = createAdminClient({
    errors: [{ code: 'DB_DELETE_FAILED', message: 'database secret' }],
  })
  const logger = { entries: [], error(entry) { this.entries.push(entry) } }
  const { service } = buildService({ storageService, adminClient, logger })

  await assert.rejects(
    service.createSubmission(studentAuth(supabase), assignmentId, image),
    (error) => error.code === 'SUBMISSION_ROLLBACK_FAILED',
  )
  assert.equal(logger.entries[0].event, 'submission_row_rollback_failed')
  assert.equal(JSON.stringify(logger.entries).includes('secret'), false)
})
