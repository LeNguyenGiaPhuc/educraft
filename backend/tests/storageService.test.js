import assert from 'node:assert/strict'
import test from 'node:test'

import {
  REFERENCE_MATERIALS_BUCKET,
  STUDENT_SUBMISSIONS_BUCKET,
  createStorageService,
} from '../src/modules/storage/storageService.js'

const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const submissionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const fileId = 'generated-file-id'
const signatures = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': Buffer.from('RIFF0000WEBP'),
}

function imageFile(mimeType, originalname = 'student note.jpg') {
  return {
    buffer: signatures[mimeType],
    mimetype: mimeType,
    originalname,
    size: signatures[mimeType].length,
  }
}

function createFakeClient({ uploadError = null, removeError = null } = {}) {
  const calls = []

  return {
    calls,
    storage: {
      from(bucket) {
        return {
          async upload(path, buffer, options) {
            calls.push({ operation: 'upload', bucket, path, buffer, options })
            return { data: uploadError ? null : { path }, error: uploadError }
          },
          async remove(paths) {
            calls.push({ operation: 'remove', bucket, paths })
            return { data: removeError ? null : paths, error: removeError }
          },
        }
      },
    },
  }
}

function buildService(adminClient = createFakeClient()) {
  return createStorageService({
    adminClient,
    createFileId: () => fileId,
  })
}

test('reference upload generates a private reference path and metadata', async () => {
  const client = createFakeClient()
  const service = buildService()

  const result = await service.uploadReferenceFile({
    client,
    assignmentId,
    file: imageFile('image/jpeg', 'teacher-reference.jpeg'),
  })

  assert.deepEqual(result, {
    bucket: REFERENCE_MATERIALS_BUCKET,
    path: `${assignmentId}/${fileId}.jpg`,
    fullPath: `${REFERENCE_MATERIALS_BUCKET}/${assignmentId}/${fileId}.jpg`,
    fileName: `${fileId}.jpg`,
    originalFilename: 'teacher-reference.jpeg',
    mimeType: 'image/jpeg',
    sizeBytes: signatures['image/jpeg'].length,
  })
  assert.equal(client.calls[0].bucket, REFERENCE_MATERIALS_BUCKET)
  assert.deepEqual(client.calls[0].options, {
    contentType: 'image/jpeg',
    upsert: false,
  })
})

test('submission upload uses its own bucket and an extension derived from content type', async () => {
  const client = createFakeClient()
  const service = buildService()

  const result = await service.uploadSubmissionFile({
    client,
    submissionId,
    file: imageFile('image/webp', 'notes.anything'),
  })

  assert.equal(result.bucket, STUDENT_SUBMISSIONS_BUCKET)
  assert.equal(result.path, `${submissionId}/${fileId}.webp`)
  assert.equal(result.fullPath, `${STUDENT_SUBMISSIONS_BUCKET}/${submissionId}/${fileId}.webp`)
  assert.equal(client.calls[0].bucket, STUDENT_SUBMISSIONS_BUCKET)
})

test('client paths are rejected and original filenames cannot traverse directories', async () => {
  const client = createFakeClient()
  const service = buildService()

  await assert.rejects(
    service.uploadReferenceFile({
      client,
      assignmentId,
      file: imageFile('image/png'),
      path: '../../chosen-by-client.png',
    }),
    (error) => error.code === 'CLIENT_STORAGE_PATH_FORBIDDEN',
  )
  await assert.rejects(
    service.uploadReferenceFile({
      client,
      assignmentId,
      file: imageFile('image/png', '../../escape.png'),
    }),
    (error) => error.code === 'INVALID_IMAGE_FILENAME',
  )
  assert.equal(client.calls.length, 0)
})

test('Supabase upload failure is surfaced without returning raw details', async () => {
  const client = createFakeClient({ uploadError: new Error('private provider detail') })
  const service = buildService()

  await assert.rejects(
    service.uploadReferenceFile({
      client,
      assignmentId,
      file: imageFile('image/png', 'reference.png'),
    }),
    (error) => (
      error.status === 500
      && error.code === 'STORAGE_UPLOAD_FAILED'
      && !error.message.includes('provider')
    ),
  )
})

test('reference and submission removal use the requested private bucket', async () => {
  const client = createFakeClient()
  const service = buildService()
  const referencePath = `${assignmentId}/${fileId}.png`
  const submissionPath = `${submissionId}/${fileId}.webp`

  const referenceResult = await service.removeReferenceFile({ client, path: referencePath })
  const submissionResult = await service.removeSubmissionFile({ client, path: submissionPath })

  assert.equal(referenceResult.fullPath, `${REFERENCE_MATERIALS_BUCKET}/${referencePath}`)
  assert.equal(submissionResult.fullPath, `${STUDENT_SUBMISSIONS_BUCKET}/${submissionPath}`)
  assert.deepEqual(client.calls.map((call) => call.bucket), [
    REFERENCE_MATERIALS_BUCKET,
    STUDENT_SUBMISSIONS_BUCKET,
  ])
})

test('removal failure is surfaced and never reported as successful cleanup', async () => {
  const client = createFakeClient({ removeError: new Error('remove failed') })
  const service = buildService()

  await assert.rejects(
    service.removeSubmissionFile({
      client,
      path: `${submissionId}/${fileId}.jpg`,
    }),
    (error) => error.status === 500 && error.code === 'STORAGE_REMOVE_FAILED',
  )
})

test('explicit rollback uses the injected admin client', async () => {
  const userClient = createFakeClient()
  const adminClient = createFakeClient()
  const service = buildService(adminClient)
  const uploaded = await service.uploadSubmissionFile({
    client: userClient,
    submissionId,
    file: imageFile('image/jpeg'),
  })

  const result = await service.rollbackUploadedFile(uploaded)

  assert.equal(userClient.calls.length, 1)
  assert.equal(adminClient.calls.length, 1)
  assert.equal(adminClient.calls[0].operation, 'remove')
  assert.equal(adminClient.calls[0].bucket, STUDENT_SUBMISSIONS_BUCKET)
  assert.equal(result.path, uploaded.path)
})
