import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createAiEvaluationInputService } from '../src/modules/ai-evaluations/aiEvaluationInputService.js'
import {
  REFERENCE_MATERIALS_BUCKET,
  STUDENT_SUBMISSIONS_BUCKET,
} from '../src/modules/storage/storageService.js'

const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const submissionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const auth = {
  profile: {
    id: 'teacher-id',
    role: 'TEACHER',
    email: 'teacher@example.com',
  },
}

function reference(path, sizeBytes, createdAt) {
  return {
    storage_path: path,
    mime_type: 'image/jpeg',
    size_bytes: sizeBytes,
    created_at: createdAt,
    uploaded_by: 'teacher-id',
    signed_url: `https://signed.test/${path}`,
  }
}

function submissionFile(path, sizeBytes, pageOrder) {
  return {
    storage_path: path,
    mime_type: 'image/png',
    size_bytes: sizeBytes,
    page_order: pageOrder,
    created_at: `2026-09-21T00:0${pageOrder}:00.000Z`,
    signed_url: `https://signed.test/${path}`,
  }
}

function createFixture({ references, files, assignmentService, downloads = {} }) {
  const downloadCalls = []
  const assignment = {
    id: assignmentId,
    title: 'Lực ma sát',
    coverage_threshold: 80,
    class_id: 'class-id',
    created_by: 'teacher-id',
  }
  const service = createAiEvaluationInputService({
    adminClient: { name: 'admin-client' },
    assignmentService: assignmentService ?? {
      async getAssignment() {
        return assignment
      },
    },
    referenceService: {
      async listReferences() {
        return references
      },
    },
    storageService: {
      async downloadPrivateImage(input) {
        downloadCalls.push(input)
        return downloads[input.path] ?? Buffer.from(input.path)
      },
    },
  })

  return {
    service,
    downloadCalls,
    submission: {
      id: submissionId,
      assignment_id: assignmentId,
      student_id: 'student-id',
      student: {
        id: 'student-id',
        full_name: 'Student private name',
        student_code: 'S001',
      },
      status: 'SUBMITTED',
      files,
    },
  }
}

test('loads authorized references and submission images in page order', async () => {
  const fixture = createFixture({
    references: [
      reference(`${assignmentId}/second.jpg`, 10, '2026-09-21T00:02:00.000Z'),
      reference(`${assignmentId}/first.jpg`, 10, '2026-09-21T00:01:00.000Z'),
    ],
    files: [
      submissionFile(`${submissionId}/page-2.png`, 20, 2),
      submissionFile(`${submissionId}/page-1.png`, 20, 1),
    ],
  })

  const result = await fixture.service.loadEvaluationInput(auth, fixture.submission)

  assert.deepEqual(result.assignmentTitle, 'Lực ma sát')
  assert.equal(result.coverageThreshold, 80)
  assert.deepEqual(result.referenceImages.map((image) => image.order), [1, 2])
  assert.deepEqual(result.submissionImages.map((image) => image.order), [1, 2])
  assert.deepEqual(
    result.referenceImages.map((image) => image.buffer.toString()),
    [`${assignmentId}/first.jpg`, `${assignmentId}/second.jpg`],
  )
  assert.deepEqual(
    result.submissionImages.map((image) => image.buffer.toString()),
    [`${submissionId}/page-1.png`, `${submissionId}/page-2.png`],
  )
  assert.deepEqual(fixture.downloadCalls.map((call) => [call.bucket, call.path]), [
    [REFERENCE_MATERIALS_BUCKET, `${assignmentId}/first.jpg`],
    [REFERENCE_MATERIALS_BUCKET, `${assignmentId}/second.jpg`],
    [STUDENT_SUBMISSIONS_BUCKET, `${submissionId}/page-1.png`],
    [STUDENT_SUBMISSIONS_BUCKET, `${submissionId}/page-2.png`],
  ])
  assert.equal('student' in result, false)
  assert.equal('studentId' in result, false)
  assert.equal('auth' in result, false)
})

test('requires at least one reference image', async () => {
  const fixture = createFixture({
    references: [],
    files: [submissionFile(`${submissionId}/page-1.png`, 20, 1)],
  })

  await assert.rejects(
    fixture.service.loadEvaluationInput(auth, fixture.submission),
    (error) => error instanceof AppError
      && error.status === 422
      && error.code === 'AI_REFERENCE_REQUIRED',
  )
  assert.equal(fixture.downloadCalls.length, 0)
})

test('requires at least one submission image', async () => {
  const fixture = createFixture({
    references: [reference(`${assignmentId}/reference.jpg`, 10, '2026-09-21T00:01:00.000Z')],
    files: [],
  })

  await assert.rejects(
    fixture.service.loadEvaluationInput(auth, fixture.submission),
    (error) => error instanceof AppError
      && error.status === 422
      && error.code === 'AI_SUBMISSION_IMAGE_REQUIRED',
  )
  assert.equal(fixture.downloadCalls.length, 0)
})

test('rejects more references than the configured limit before downloading', async () => {
  const fixture = createFixture({
    references: Array.from({ length: 5 }, (_, index) => (
      reference(
        `${assignmentId}/reference-${index + 1}.jpg`,
        10,
        `2026-09-21T00:0${index + 1}:00.000Z`,
      )
    )),
    files: [submissionFile(`${submissionId}/page-1.png`, 10, 1)],
  })

  await assert.rejects(
    fixture.service.loadEvaluationInput(auth, fixture.submission),
    (error) => error.status === 422 && error.code === 'AI_INPUT_LIMIT_EXCEEDED',
  )
  assert.equal(fixture.downloadCalls.length, 0)
})

test('rejects combined image bytes over the configured limit before downloading', async () => {
  const fixture = createFixture({
    references: [reference(`${assignmentId}/reference.jpg`, 8, '2026-09-21T00:01:00.000Z')],
    files: [submissionFile(`${submissionId}/page-1.png`, 8, 1)],
  })
  const limitedService = createAiEvaluationInputService({
    adminClient: { name: 'admin-client' },
    assignmentService: { async getAssignment() { return { title: 'Lực ma sát', coverage_threshold: 80 } } },
    referenceService: { async listReferences() { return fixture.serviceReferences ?? [reference(`${assignmentId}/reference.jpg`, 8, '2026-09-21T00:01:00.000Z')] } },
    storageService: { async downloadPrivateImage() { throw new Error('should not download') } },
    maxTotalBytes: 15,
  })

  await assert.rejects(
    limitedService.loadEvaluationInput(auth, fixture.submission),
    (error) => error.status === 422 && error.code === 'AI_INPUT_LIMIT_EXCEEDED',
  )
})

test('authorization failure happens before any private image download', async () => {
  const fixture = createFixture({
    references: [reference(`${assignmentId}/reference.jpg`, 10, '2026-09-21T00:01:00.000Z')],
    files: [submissionFile(`${submissionId}/page-1.png`, 10, 1)],
    assignmentService: {
      async getAssignment() {
        throw new AppError(403, 'CLASS_FORBIDDEN', 'Bạn không được phân công cho lớp học này.')
      },
    },
  })

  await assert.rejects(
    fixture.service.loadEvaluationInput(auth, fixture.submission),
    (error) => error.code === 'CLASS_FORBIDDEN',
  )
  assert.equal(fixture.downloadCalls.length, 0)
})
