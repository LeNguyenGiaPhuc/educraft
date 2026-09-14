import assert from 'node:assert/strict'
import test from 'node:test'

import { createSubmissionService } from './submissionService.js'

function fakeApi() {
  const calls = []
  const api = {}

  for (const method of ['get', 'upload', 'patch']) {
    api[method] = async (path, body) => {
      calls.push({ method, path, body })
      return { method, path, body }
    }
  }

  return { api, calls }
}

function assertFileFormData(call, fileName) {
  assert.ok(call.body instanceof FormData)
  const file = call.body.get('file')
  assert.ok(file)
  assert.equal(file.name, fileName)
}

test('supports student submission and history endpoints', async () => {
  const { api, calls } = fakeApi()
  const submissions = createSubmissionService({ api })
  const file = new Blob(['note'], { type: 'image/jpeg' })

  await submissions.createSubmission('assignment-1', file, 'note.jpg')
  await submissions.listMySubmissions('assignment-1')
  await submissions.listSubmissions('assignment-1')
  await submissions.getSubmission('submission-1')
  await submissions.finalizeSubmission('submission-1', {
    final_status: 'COMPLETED',
    final_score: 92,
    feedback: 'Đạt yêu cầu.',
  })

  assert.equal(calls[0].method, 'upload')
  assert.equal(calls[0].path, '/api/assignments/assignment-1/submissions')
  assertFileFormData(calls[0], 'note.jpg')
  assert.deepEqual(calls[1], {
    method: 'get',
    path: '/api/assignments/assignment-1/my-submissions',
    body: undefined,
  })
  assert.deepEqual(calls[2], {
    method: 'get',
    path: '/api/assignments/assignment-1/submissions',
    body: undefined,
  })
  assert.deepEqual(calls[3], {
    method: 'get',
    path: '/api/submissions/submission-1',
    body: undefined,
  })
  assert.deepEqual(calls[4], {
    method: 'patch',
    path: '/api/submissions/submission-1/review',
    body: {
      final_status: 'COMPLETED',
      final_score: 92,
      feedback: 'Đạt yêu cầu.',
    },
  })
})
