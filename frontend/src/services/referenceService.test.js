import assert from 'node:assert/strict'
import test from 'node:test'

import { createReferenceService } from './referenceService.js'

function fakeApi() {
  const calls = []
  const api = {}

  for (const method of ['get', 'upload', 'delete']) {
    api[method] = async (path, body, options) => {
      calls.push({ method, path, body, options })
      return { method, path, body, options }
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
    options: undefined,
  })
})

test('adding a reference uses POST semantics without changing existing references', async () => {
  const existing = Object.freeze([
    Object.freeze({ id: 'reference-a', original_filename: 'a.png' }),
    Object.freeze({ id: 'reference-b', original_filename: 'b.png' }),
  ])
  const before = structuredClone(existing)
  const { api, calls } = fakeApi()
  const references = createReferenceService({ api })
  const file = new Blob(['new'], { type: 'image/webp' })

  await references.uploadReference('assignment-1', file, 'new.webp')

  assert.equal(calls[0].path, '/api/assignments/assignment-1/references')
  assert.equal(calls[0].options, undefined)
  assertFileFormData(calls[0], 'new.webp')
  assert.deepEqual(existing, before)
})

test('replacing one reference sends its ID and leaves another reference unchanged', async () => {
  const existing = Object.freeze([
    Object.freeze({ id: 'reference-a', original_filename: 'a.png' }),
    Object.freeze({ id: 'reference-b', original_filename: 'b.png' }),
  ])
  const before = structuredClone(existing)
  const { api, calls } = fakeApi()
  const references = createReferenceService({ api })
  const file = new Blob(['replacement'], { type: 'image/png' })

  await references.replaceReference('assignment-1', 'reference-b', file, 'b-new.png')

  assert.equal(
    calls[0].path,
    '/api/assignments/assignment-1/references/reference-b',
  )
  assert.deepEqual(calls[0].options, { method: 'PUT' })
  assertFileFormData(calls[0], 'b-new.png')
  assert.deepEqual(existing, before)
})

test('deleting one reference sends its ID and leaves another reference unchanged', async () => {
  const existing = Object.freeze([
    Object.freeze({ id: 'reference-a', original_filename: 'a.png' }),
    Object.freeze({ id: 'reference-b', original_filename: 'b.png' }),
  ])
  const before = structuredClone(existing)
  const { api, calls } = fakeApi()
  const references = createReferenceService({ api })

  await references.deleteReference('assignment-1', 'reference-b')

  assert.equal(
    calls[0].path,
    '/api/assignments/assignment-1/references/reference-b',
  )
  assert.deepEqual(existing, before)
})

test('failed reference operation rejects without changing existing reference data', async () => {
  const existing = Object.freeze([
    Object.freeze({ id: 'reference-a', original_filename: 'a.png' }),
  ])
  const before = structuredClone(existing)
  const references = createReferenceService({
    api: {
      async upload() {
        throw new Error('Không thể thêm bài mẫu.')
      },
    },
  })

  await assert.rejects(
    references.uploadReference(
      'assignment-1',
      new Blob(['new'], { type: 'image/png' }),
      'new.png',
    ),
    /Không thể thêm bài mẫu/,
  )
  assert.deepEqual(existing, before)
})
