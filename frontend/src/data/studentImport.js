import { validateStudentRows } from './mockStudentStore.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const numberColumn = findColumn(headerRow, [
    'stt',
    'so thu tu',
    'number',
    'no',
  ])
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
  if (nameColumn === -1) {
    headerErrors.push({ rowNumber: 1, message: 'File phải có cột Họ và tên.' })
  }

  // The roster import uses STT, Họ và tên and Email. Keep the old
  // Mã học sinh format readable for existing teacher mock fixtures.
  if (numberColumn !== -1) {
    if (emailColumn === -1) {
      headerErrors.push({ rowNumber: 1, message: 'File phải có cột Email.' })
    }
  } else if (codeColumn === -1) {
    headerErrors.push({ rowNumber: 1, message: 'File phải có cột STT.' })
  }

  if (headerErrors.length > 0) {
    return { rows: [], errors: headerErrors }
  }

  if (numberColumn !== -1) {
    const parsedRows = dataRows.map((row, index) => ({
      studentNumber: row[numberColumn],
      name: row[nameColumn],
      email: row[emailColumn],
      rowNumber: index + 2,
    }))

    return validateRosterRows(parsedRows)
  }

  const parsedRows = dataRows.map((row, index) => ({
    code: row[codeColumn],
    name: row[nameColumn],
    email: emailColumn === -1 ? '' : row[emailColumn],
    rowNumber: index + 2,
  }))

  return validateStudentRows(parsedRows)
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeStudentNumber(value) {
  const normalized = String(value ?? '').trim()

  if (!/^\d+$/.test(normalized)) {
    return normalized
  }

  return String(Number(normalized))
}

function validateRosterRows(rows = []) {
  const normalizedRows = []
  const errors = []
  const seenNumbers = new Set()
  const seenEmails = new Set()

  rows.forEach((row, index) => {
    const studentNumber = String(row.studentNumber ?? '').trim()
    const name = String(row.name ?? '').trim()
    const email = normalizeEmail(row.email)
    const rowNumber = Number(row.rowNumber) || index + 2

    if (!studentNumber && !name && !email) {
      return
    }

    const rowErrors = []
    const numberKey = normalizeStudentNumber(studentNumber)

    if (!studentNumber) {
      rowErrors.push('STT là bắt buộc.')
    } else if (!/^\d+$/.test(studentNumber) || Number(studentNumber) < 1) {
      rowErrors.push('STT phải là số nguyên dương.')
    } else if (seenNumbers.has(numberKey)) {
      rowErrors.push(`STT ${studentNumber} bị trùng trong file.`)
    }

    if (!name) {
      rowErrors.push('Họ và tên là bắt buộc.')
    }

    if (!email) {
      rowErrors.push('Email là bắt buộc.')
    } else if (!EMAIL_PATTERN.test(email)) {
      rowErrors.push('Email không hợp lệ.')
    } else if (seenEmails.has(email)) {
      rowErrors.push(`Email ${email} bị trùng trong file.`)
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((message) => errors.push({ rowNumber, message }))
      return
    }

    seenNumbers.add(numberKey)
    seenEmails.add(email)
    normalizedRows.push({ studentNumber, name, email })
  })

  return { rows: normalizedRows, errors }
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
