import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiError, createApiClient } from './apiClient.js'

function response(body, options = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body)

  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    async text() {
      return payload
    },
  }
}

test('builds a JSON request with the API base URL and session cookies', async () => {
  const requests = []
  const api = createApiClient({
    baseUrl: 'http://localhost:3000/',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return response({ data: { id: 'assignment-1' } })
    },
  })

  const data = await api.post('/api/classes/class-1/assignments', {
    title: 'Test 01',
  })

  assert.deepEqual(data, { id: 'assignment-1' })
  assert.equal(requests[0].url, 'http://localhost:3000/api/classes/class-1/assignments')
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.credentials, 'include')
  assert.equal(requests[0].options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(requests[0].options.body), { title: 'Test 01' })
})

test('sends FormData without overriding the browser content type', async () => {
  const requests = []
  const api = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return response({ data: { id: 'reference-1' } })
    },
  })
  const formData = new FormData()
  formData.append('file', new Blob(['image'], { type: 'image/png' }), 'note.png')

  const data = await api.upload('/api/assignments/assignment-1/references', formData)

  assert.deepEqual(data, { id: 'reference-1' })
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.credentials, 'include')
  assert.equal(requests[0].options.body, formData)
  assert.equal(requests[0].options.headers, undefined)
})

test('allows an upload method to be overridden for replacement endpoints', async () => {
  const requests = []
  const api = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return response({ data: { id: 'reference-1' } })
    },
  })
  const formData = new FormData()
  formData.append('file', new Blob(['image'], { type: 'image/png' }), 'updated.png')

  await api.upload('/api/assignments/assignment-1/references/reference-1', formData, {
    method: 'PUT',
  })

  assert.equal(requests[0].options.method, 'PUT')
})

test('maps an API error envelope to ApiError', async () => {
  const api = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetchImpl: async () => response(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Kiểm tra dữ liệu.',
          fields: { title: 'Nhập tên bài kiểm tra.' },
        },
      },
      { ok: false, status: 422 },
    ),
  })

  await assert.rejects(
    api.post('/api/classes/class-1/assignments', {}),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 422)
      assert.equal(error.code, 'VALIDATION_ERROR')
      assert.equal(error.message, 'Kiểm tra dữ liệu.')
      assert.deepEqual(error.fields, { title: 'Nhập tên bài kiểm tra.' })
      return true
    },
  )
})

test('wraps network failures with a stable error code', async () => {
  const api = createApiClient({
    fetchImpl: async () => {
      throw new Error('offline')
    },
  })

  await assert.rejects(api.get('/api/health'), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'NETWORK_ERROR')
    assert.equal(error.message, 'Không thể kết nối đến máy chủ.')
    return true
  })
})

test('returns no value for a successful empty response', async () => {
  const api = createApiClient({
    fetchImpl: async () => response(undefined, { status: 204 }),
  })

  assert.equal(await api.delete('/api/assignments/assignment-1'), undefined)
})
