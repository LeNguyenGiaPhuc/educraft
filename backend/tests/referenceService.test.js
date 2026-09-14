import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createReferenceService } from '../src/modules/assignments/referenceService.js'
import { REFERENCE_MATERIALS_BUCKET } from '../src/modules/storage/storageService.js'

const teacherId = '22222222-2222-4222-8222-222222222222'
const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherAssignmentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const referenceAId = '11111111-aaaa-4111-8111-111111111111'
const referenceBId = '22222222-bbbb-4222-8222-222222222222'
const referenceCId = '33333333-cccc-4333-8333-333333333333'

function reference(id, fileName) {
  return {
    id,
    assignment_id: assignmentId,
    storage_path: `${assignmentId}/${fileName}`,
    original_filename: fileName,
    mime_type: 'image/png',
    size_bytes: 8,
    uploaded_by: teacherId,
    created_at: '2026-09-14T00:00:00Z',
  }
}

const references = [
  reference(referenceAId, 'reference-a.png'),
  reference(referenceBId, 'reference-b.png'),
  reference(referenceCId, 'reference-c.png'),
]

function uploaded(fileName = 'new-file.png') {
  return {
    bucket: REFERENCE_MATERIALS_BUCKET,
    path: `${assignmentId}/${fileName}`,
    fullPath: `${REFERENCE_MATERIALS_BUCKET}/${assignmentId}/${fileName}`,
    fileName,
    originalFilename: 'teacher-note.png',
    mimeType: 'image/png',
    sizeBytes: 8,
  }
}

function withSignedUrl(reference) {
  return {
    ...reference,
    signed_url: `https://signed.test/${reference.storage_path}`,
  }
}

function createQueuedSupabase(results, events = []) {
  const calls = []
  let resultIndex = 0

  function nextResult(call, terminal) {
    events.push(`db:${call.operation}:${terminal}`)
    const result = results[resultIndex]
    resultIndex += 1
    return Promise.resolve(result)
  }

  return {
    calls,
    from(table) {
      const call = { table, operation: 'select', filters: [] }
      calls.push(call)

      const builder = {
        select(columns) {
          call.columns = columns
          return builder
        },
        eq(column, value) {
          call.filters.push([column, value])
          return builder
        },
        order(column, options) {
          call.order = [column, options]
          return nextResult(call, 'order')
        },
        insert(value) {
          call.operation = 'insert'
          call.value = value
          return builder
        },
        update(value) {
          call.operation = 'update'
          call.value = value
          return builder
        },
        delete() {
          call.operation = 'delete'
          return builder
        },
        maybeSingle() {
          return nextResult(call, 'maybeSingle')
        },
        single() {
          return nextResult(call, 'single')
        },
      }

      return builder
    },
  }
}

function createAssignmentService(events = [], error = null) {
  return {
    calls: [],
    async getAssignment(auth, requestedAssignmentId) {
      this.calls.push({ auth, assignmentId: requestedAssignmentId })
      events.push('authorize-assignment')
      if (error) throw error
      return { id: requestedAssignmentId }
    },
  }
}

function createStorageService({
  events = [],
  uploads = [uploaded()],
  uploadError = null,
  removeError = null,
  rollbackError = null,
} = {}) {
  let uploadIndex = 0

  return {
    uploadCalls: [],
    removeCalls: [],
    rollbackCalls: [],
    async uploadReferenceFile(input) {
      this.uploadCalls.push(input)
      events.push('storage-upload')
      if (uploadError) throw uploadError
      const result = uploads[uploadIndex]
      uploadIndex += 1
      return result
    },
    async removeReferenceFile(input) {
      this.removeCalls.push(input)
      events.push('storage-remove')
      if (removeError) throw removeError
      return input
    },
    async rollbackUploadedFile(input) {
      this.rollbackCalls.push(input)
      events.push('storage-rollback')
      if (rollbackError) throw rollbackError
      return input
    },
    async createSignedUrl({ path }) {
      events.push('storage-signed-url')
      return `https://signed.test/${path}`
    },
  }
}

function teacherAuth(supabase) {
  return {
    profile: { id: teacherId, role: 'TEACHER' },
    supabase,
  }
}

function createLogger() {
  return {
    entries: [],
    error(entry) { this.entries.push(entry) },
  }
}

test('assigned teacher lists every reference for an assignment', async () => {
  const events = []
  const supabase = createQueuedSupabase([{ data: references, error: null }], events)
  const assignmentService = createAssignmentService(events)
  const service = createReferenceService({
    assignmentService,
    storageService: createStorageService({ events }),
  })

  const result = await service.listReferences(teacherAuth(supabase), assignmentId)

  assert.deepEqual(result, references.map(withSignedUrl))
  assert.deepEqual(events, [
    'authorize-assignment',
    'db:select:order',
    'storage-signed-url',
    'storage-signed-url',
    'storage-signed-url',
  ])
  assert.deepEqual(supabase.calls[0].filters, [['assignment_id', assignmentId]])
})

test('separate uploads append metadata records without updating existing references', async () => {
  const firstUpload = uploaded('first.png')
  const secondUpload = uploaded('second.png')
  const firstReference = reference(referenceAId, 'first.png')
  const secondReference = reference(referenceBId, 'second.png')
  const supabase = createQueuedSupabase([
    { data: firstReference, error: null },
    { data: secondReference, error: null },
  ])
  const storageService = createStorageService({ uploads: [firstUpload, secondUpload] })
  const service = createReferenceService({
    assignmentService: createAssignmentService(),
    storageService,
  })
  const auth = teacherAuth(supabase)

  assert.deepEqual(
    await service.uploadReference(auth, assignmentId, { name: 'first' }),
    withSignedUrl(firstReference),
  )
  assert.deepEqual(
    await service.uploadReference(auth, assignmentId, { name: 'second' }),
    withSignedUrl(secondReference),
  )

  const metadataWrites = supabase.calls.filter((call) => call.operation === 'insert')
  assert.equal(metadataWrites.length, 2)
  assert.equal(supabase.calls.some((call) => call.operation === 'update'), false)
  assert.equal(storageService.removeCalls.length, 0)
  assert.equal(metadataWrites[0].value.uploaded_by, teacherId)
  assert.equal(metadataWrites[1].value.storage_path, `${assignmentId}/second.png`)
})

test('replacement switches one row before removing only that row old object', async () => {
  const events = []
  const replacement = { ...references[1], storage_path: `${assignmentId}/replacement.png` }
  const supabase = createQueuedSupabase([
    { data: references[1], error: null },
    { data: replacement, error: null },
  ], events)
  const assignmentService = createAssignmentService(events)
  const storageService = createStorageService({ events, uploads: [uploaded('replacement.png')] })
  const service = createReferenceService({ assignmentService, storageService })

  const result = await service.replaceReference(
    teacherAuth(supabase),
    assignmentId,
    referenceBId,
    { name: 'replacement' },
  )

  assert.deepEqual(result, withSignedUrl(replacement))
  assert.deepEqual(events, [
    'db:select:maybeSingle',
    'authorize-assignment',
    'storage-upload',
    'db:update:single',
    'storage-remove',
    'storage-signed-url',
  ])
  const update = supabase.calls.find((call) => call.operation === 'update')
  assert.deepEqual(update.filters, [
    ['id', referenceBId],
    ['assignment_id', assignmentId],
  ])
  assert.equal(update.value.assignment_id, undefined)
  assert.equal(update.value.uploaded_by, teacherId)
  assert.deepEqual(storageService.removeCalls.map((call) => call.path), [
    references[1].storage_path,
  ])
})

test('deletion removes one metadata row before removing its object', async () => {
  const events = []
  const supabase = createQueuedSupabase([
    { data: references[1], error: null },
    { data: references[1], error: null },
  ], events)
  const assignmentService = createAssignmentService(events)
  const storageService = createStorageService({ events })
  const service = createReferenceService({ assignmentService, storageService })

  const result = await service.deleteReference(
    teacherAuth(supabase),
    assignmentId,
    referenceBId,
  )

  assert.equal(result, references[1])
  assert.deepEqual(events, [
    'db:select:maybeSingle',
    'authorize-assignment',
    'db:delete:single',
    'storage-remove',
  ])
  const deletion = supabase.calls.find((call) => call.operation === 'delete')
  assert.deepEqual(deletion.filters, [
    ['id', referenceBId],
    ['assignment_id', assignmentId],
  ])
})

test('unassigned teacher is rejected before listing or uploading references', async () => {
  const forbidden = new AppError(403, 'CLASS_FORBIDDEN', 'Forbidden')
  const assignmentService = createAssignmentService([], forbidden)
  const storageService = createStorageService()
  const service = createReferenceService({ assignmentService, storageService })
  const supabase = createQueuedSupabase([])
  const auth = teacherAuth(supabase)

  await assert.rejects(
    service.listReferences(auth, assignmentId),
    (error) => error.code === 'CLASS_FORBIDDEN',
  )
  await assert.rejects(
    service.uploadReference(auth, assignmentId, { name: 'file' }),
    (error) => error.code === 'CLASS_FORBIDDEN',
  )
  assert.equal(supabase.calls.length, 0)
  assert.equal(storageService.uploadCalls.length, 0)
})

test('reference from another assignment cannot be replaced or deleted', async () => {
  const assignmentService = createAssignmentService()
  const storageService = createStorageService()
  const service = createReferenceService({ assignmentService, storageService })
  const operations = [
    (supabase) => service.replaceReference(
      teacherAuth(supabase), otherAssignmentId, referenceBId, { name: 'file' },
    ),
    (supabase) => service.deleteReference(
      teacherAuth(supabase), otherAssignmentId, referenceBId,
    ),
  ]

  for (const operation of operations) {
    const supabase = createQueuedSupabase([{ data: null, error: null }])
    await assert.rejects(
      operation(supabase),
      (error) => error.status === 404 && error.code === 'REFERENCE_NOT_FOUND',
    )
  }

  assert.equal(assignmentService.calls.length, 0)
  assert.equal(storageService.uploadCalls.length, 0)
  assert.equal(storageService.removeCalls.length, 0)
})

test('unassigned teacher cannot replace or delete a reference from another class', async () => {
  const forbidden = new AppError(403, 'CLASS_FORBIDDEN', 'Forbidden')
  const operations = [
    (service, supabase) => service.replaceReference(
      teacherAuth(supabase), assignmentId, referenceBId, { name: 'file' },
    ),
    (service, supabase) => service.deleteReference(
      teacherAuth(supabase), assignmentId, referenceBId,
    ),
  ]

  for (const operation of operations) {
    const supabase = createQueuedSupabase([{ data: references[1], error: null }])
    const storageService = createStorageService()
    const service = createReferenceService({
      assignmentService: createAssignmentService([], forbidden),
      storageService,
    })

    await assert.rejects(
      operation(service, supabase),
      (error) => error.code === 'CLASS_FORBIDDEN',
    )
    assert.equal(supabase.calls.some((call) => ['update', 'delete'].includes(call.operation)), false)
    assert.equal(storageService.uploadCalls.length, 0)
    assert.equal(storageService.removeCalls.length, 0)
  }
})

test('metadata insertion failure rolls back the newly uploaded object', async () => {
  const databaseError = new Error('metadata insert failed')
  const newUpload = uploaded('new.png')
  const events = []
  const supabase = createQueuedSupabase([{ data: null, error: databaseError }], events)
  const storageService = createStorageService({ events, uploads: [newUpload] })
  const service = createReferenceService({
    assignmentService: createAssignmentService(events),
    storageService,
  })

  await assert.rejects(
    service.uploadReference(teacherAuth(supabase), assignmentId, { name: 'file' }),
    databaseError,
  )
  assert.deepEqual(events, [
    'authorize-assignment',
    'storage-upload',
    'db:insert:single',
    'storage-rollback',
  ])
  assert.deepEqual(storageService.rollbackCalls, [newUpload])
})

test('replacement upload failure leaves old metadata and object untouched', async () => {
  const storageError = new AppError(500, 'STORAGE_UPLOAD_FAILED', 'Upload failed')
  const supabase = createQueuedSupabase([{ data: references[1], error: null }])
  const storageService = createStorageService({ uploadError: storageError })
  const service = createReferenceService({
    assignmentService: createAssignmentService(),
    storageService,
  })

  await assert.rejects(
    service.replaceReference(
      teacherAuth(supabase), assignmentId, referenceBId, { name: 'file' },
    ),
    storageError,
  )
  assert.equal(supabase.calls.some((call) => call.operation === 'update'), false)
  assert.equal(storageService.removeCalls.length, 0)
  assert.equal(storageService.rollbackCalls.length, 0)
})

test('replacement metadata failure removes new object and preserves old object', async () => {
  const databaseError = new Error('metadata update failed')
  const newUpload = uploaded('replacement.png')
  const supabase = createQueuedSupabase([
    { data: references[1], error: null },
    { data: null, error: databaseError },
  ])
  const storageService = createStorageService({ uploads: [newUpload] })
  const service = createReferenceService({
    assignmentService: createAssignmentService(),
    storageService,
  })

  await assert.rejects(
    service.replaceReference(
      teacherAuth(supabase), assignmentId, referenceBId, { name: 'file' },
    ),
    databaseError,
  )
  assert.deepEqual(storageService.rollbackCalls, [newUpload])
  assert.equal(storageService.removeCalls.length, 0)
})

test('old-object cleanup failure keeps new metadata and is logged and surfaced', async () => {
  const replacement = { ...references[1], storage_path: `${assignmentId}/replacement.png` }
  const supabase = createQueuedSupabase([
    { data: references[1], error: null },
    { data: replacement, error: null },
  ])
  const logger = createLogger()
  const storageService = createStorageService({
    uploads: [uploaded('replacement.png')],
    removeError: new AppError(500, 'STORAGE_REMOVE_FAILED', 'Remove failed'),
  })
  const service = createReferenceService({
    assignmentService: createAssignmentService(),
    storageService,
    logger,
  })

  await assert.rejects(
    service.replaceReference(
      teacherAuth(supabase), assignmentId, referenceBId, { name: 'file' },
    ),
    (error) => error.code === 'REFERENCE_OLD_FILE_CLEANUP_FAILED',
  )
  assert.equal(supabase.calls.some((call) => call.operation === 'update'), true)
  assert.equal(storageService.rollbackCalls.length, 0)
  assert.equal(logger.entries[0].event, 'reference_old_object_cleanup_failed')
  assert.equal(logger.entries[0].path, references[1].storage_path)
})

test('delete cleanup failure reports the orphan after metadata was removed', async () => {
  const supabase = createQueuedSupabase([
    { data: references[1], error: null },
    { data: references[1], error: null },
  ])
  const logger = createLogger()
  const storageService = createStorageService({
    removeError: new AppError(500, 'STORAGE_REMOVE_FAILED', 'Remove failed'),
  })
  const service = createReferenceService({
    assignmentService: createAssignmentService(),
    storageService,
    logger,
  })

  await assert.rejects(
    service.deleteReference(teacherAuth(supabase), assignmentId, referenceBId),
    (error) => error.code === 'REFERENCE_FILE_CLEANUP_FAILED',
  )
  assert.equal(supabase.calls.some((call) => call.operation === 'delete'), true)
  assert.equal(logger.entries[0].event, 'reference_deleted_object_cleanup_failed')
})

test('metadata deletion failure leaves the existing Storage object untouched', async () => {
  const databaseError = new Error('metadata delete failed')
  const supabase = createQueuedSupabase([
    { data: references[1], error: null },
    { data: null, error: databaseError },
  ])
  const storageService = createStorageService()
  const service = createReferenceService({
    assignmentService: createAssignmentService(),
    storageService,
  })

  await assert.rejects(
    service.deleteReference(teacherAuth(supabase), assignmentId, referenceBId),
    databaseError,
  )
  assert.equal(storageService.removeCalls.length, 0)
})
