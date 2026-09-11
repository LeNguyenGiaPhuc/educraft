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

test('validates and normalizes imported student rows', async () => {
  const studentApi = await import('./mockStudentStore.js').catch(() => ({}))

  assert.equal(typeof studentApi.validateStudentRows, 'function')

  const result = studentApi.validateStudentRows([
    { code: ' hs260104 ', name: '  Lê Cẩm Chi  ', email: 'chi@example.com' },
    { code: '', name: 'Thiếu mã' },
  ])

  assert.deepEqual(result.rows, [
    { code: 'HS260104', name: 'Lê Cẩm Chi', email: 'chi@example.com' },
  ])
  assert.deepEqual(result.errors, [
    { rowNumber: 3, message: 'Mã học sinh là bắt buộc.' },
  ])
})

test('merges imported students and skips duplicate codes', async () => {
  const studentApi = await import('./mockStudentStore.js').catch(() => ({}))
  const storage = createMemoryStorage()

  assert.equal(typeof studentApi.mergeStudentRows, 'function')

  const firstImport = studentApi.mergeStudentRows(
    '12B1',
    [
      { code: 'HS260104', name: 'Lê Cẩm Chi', email: '' },
      { code: 'HS260105', name: 'Phạm Minh An', email: '' },
    ],
    storage,
  )
  const secondImport = studentApi.mergeStudentRows(
    '12B1',
    [
      { code: 'HS260105', name: 'Phạm Minh An cập nhật', email: '' },
      { code: 'HS260106', name: 'Vũ Hải Nam', email: '' },
    ],
    storage,
  )

  assert.equal(firstImport.addedCount, 2)
  assert.equal(secondImport.addedCount, 1)
  assert.equal(secondImport.skippedCount, 1)
  assert.deepEqual(
    studentApi.getStoredStudents('12B1', storage).map((student) => student.code),
    ['HS260104', 'HS260105', 'HS260106'],
  )
})

test('uses imported students instead of fallback rows after the first import', async () => {
  const studentApi = await import('./mockStudentStore.js').catch(() => ({}))
  const storage = createMemoryStorage()
  const fallbackRows = [
    { number: '01', name: 'Dữ liệu mẫu', code: 'MOCK01', latestSubmission: 'Chưa nộp' },
  ]

  assert.deepEqual(studentApi.getClassStudents('12B1', fallbackRows, storage), fallbackRows)

  studentApi.mergeStudentRows(
    '12B1',
    [{ code: 'HS260104', name: 'Lê Cẩm Chi', email: '' }],
    storage,
  )

  assert.deepEqual(studentApi.getClassStudents('12B1', fallbackRows, storage), [
    {
      id: 'HS260104',
      classId: '12B1',
      code: 'HS260104',
      name: 'Lê Cẩm Chi',
      email: '',
      latestSubmission: 'Chưa nộp',
    },
  ])
})
