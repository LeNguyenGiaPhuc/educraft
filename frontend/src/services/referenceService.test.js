import assert from 'node:assert/strict'
import test from 'node:test'

import { createReferenceService } from './referenceService.js'

function fakeApi() {
  const calls = []
  const api = {}

  for (const method of ['get', 'upload', 'delete']) {
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

test('lists, uploads, replaces, and deletes assignment references', async () => {
  const { api, calls } = fakeApi()
  const references = createReferenceService({ api })
  const file = new Blob(['image'], { type: 'image/png' })

  await references.listReferences('assignment-1')
  await references.uploadReference('assignment-1', file, 'reference.png')
  await references.replaceReference('assignment-1', 'reference-1', file, 'updated.png')
  await references.deleteReference('assignment-1', 'reference-1')

  assert.equal(calls[0].method, 'get')
  assert.equal(calls[0].path, '/api/assignments/assignment-1/references')
  assert.equal(calls[1].method, 'upload')
  assert.equal(calls[1].path, '/api/assignments/assignment-1/references')
  assertFileFormData(calls[1], 'reference.png')
  assert.equal(calls[2].method, 'upload')
  assert.equal(calls[2].path, '/api/assignments/assignment-1/references/reference-1')
  assertFileFormData(calls[2], 'updated.png')
  assert.deepEqual(calls[3], {
    method: 'delete',
    path: '/api/assignments/assignment-1/references/reference-1',
    body: undefined,
  })
})
