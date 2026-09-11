import assert from 'node:assert/strict'
import test from 'node:test'

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('validates and stores a teacher reference image', async () => {
  const referenceApi = await import('./mockReference.js').catch(() => ({}))

  assert.equal(typeof referenceApi.validateReferenceForm, 'function')
  assert.deepEqual(referenceApi.validateReferenceForm({}), {
    file: 'Chọn bài mẫu của giáo viên để tải lên.',
  })

  const storage = createMemoryStorage()
  const result = await referenceApi.submitReference(
    {
      assignmentId: 'nam-xuong',
      fileName: 'bai-mau.png',
      fileSizeBytes: 3000,
    },
    'success',
    0,
    storage,
  )

  assert.equal(result.status, 'success')
  assert.equal(result.data.fileName, 'bai-mau.png')
})

test('rejects a teacher reference with an unsupported format', async () => {
  const referenceApi = await import('./mockReference.js').catch(() => ({}))

  assert.equal(typeof referenceApi.validateReferenceForm, 'function')
  assert.equal(
    referenceApi.validateReferenceForm({
      fileName: 'bai-mau.pdf',
      fileSizeBytes: 1000,
    }).file,
    'Chỉ nhận file JPG, JPEG hoặc PNG cho bài mẫu.',
  )
})
