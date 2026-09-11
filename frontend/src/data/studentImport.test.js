import assert from 'node:assert/strict'
import test from 'node:test'
import * as XLSX from 'xlsx'

test('parses the first Excel sheet using Vietnamese student headers', async () => {
  const importApi = await import('./studentImport.js').catch(() => ({}))

  assert.equal(typeof importApi.parseStudentRows, 'function')

  const result = importApi.parseStudentRows([
    ['Mã học sinh', 'Họ và tên', 'Email'],
    ['HS260104', 'Lê Cẩm Chi', 'chi@example.com'],
  ])

  assert.deepEqual(result, {
    rows: [
      { code: 'HS260104', name: 'Lê Cẩm Chi', email: 'chi@example.com' },
    ],
    errors: [],
  })
})

test('reads a valid xlsx file and rejects unsupported extensions', async () => {
  const importApi = await import('./studentImport.js').catch(() => ({}))

  assert.equal(typeof importApi.readStudentExcel, 'function')

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Mã học sinh', 'Họ và tên'],
    ['HS260104', 'Lê Cẩm Chi'],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Danh sách')
  const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const file = {
    name: 'danh-sach.xlsx',
    async arrayBuffer() {
      return fileData
    },
  }

  const result = await importApi.readStudentExcel(file)
  assert.deepEqual(result.rows, [
    { code: 'HS260104', name: 'Lê Cẩm Chi', email: '' },
  ])

  await assert.rejects(
    () => importApi.readStudentExcel({ name: 'danh-sach.pdf', arrayBuffer: async () => fileData }),
    /chỉ hỗ trợ file Excel định dạng .xlsx/i,
  )
})
