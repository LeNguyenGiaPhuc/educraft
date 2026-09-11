import { validateStudentRows } from './mockStudentStore.js'

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function findColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)))
}

export function parseStudentRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: 'File Excel không có dữ liệu.' }],
    }
  }

  const [headerRow, ...dataRows] = rows
  const codeColumn = findColumn(headerRow, [
    'ma hoc sinh',
    'ma hs',
    'student code',
    'code',
  ])
  const nameColumn = findColumn(headerRow, [
    'ho va ten',
    'ho ten',
    'full name',
    'name',
  ])
  const emailColumn = findColumn(headerRow, ['email', 'e mail'])

  const headerErrors = []
  if (codeColumn === -1) {
    headerErrors.push({ rowNumber: 1, message: 'File phải có cột Mã học sinh.' })
  }
  if (nameColumn === -1) {
    headerErrors.push({ rowNumber: 1, message: 'File phải có cột Họ và tên.' })
  }

  if (headerErrors.length > 0) {
    return { rows: [], errors: headerErrors }
  }

  const parsedRows = dataRows.map((row, index) => ({
    code: row[codeColumn],
    name: row[nameColumn],
    email: emailColumn === -1 ? '' : row[emailColumn],
    rowNumber: index + 2,
  }))

  return validateStudentRows(parsedRows)
}

export async function readStudentExcel(file) {
  const fileName = String(file?.name ?? '').toLocaleLowerCase('vi-VN')

  if (!fileName.endsWith('.xlsx')) {
    throw new Error('Chỉ hỗ trợ file Excel định dạng .xlsx.')
  }

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: 'File Excel không có sheet dữ liệu.' }],
    }
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: '',
  })

  return parseStudentRows(rows)
}
