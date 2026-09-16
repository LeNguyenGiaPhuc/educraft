function normalizeStudentRow(row = {}) {
  return {
    code: String(row.code ?? row.studentCode ?? '').trim().toUpperCase(),
    name: String(row.name ?? row.fullName ?? '').trim(),
    email: String(row.email ?? '').trim(),
  }
}

export function validateStudentRows(rows = []) {
  const normalizedRows = []
  const errors = []
  const seenCodes = new Set()

  rows.forEach((row, index) => {
    const normalized = normalizeStudentRow(row)
    const rowNumber = Number(row.rowNumber) || index + 2

    if (!normalized.code && !normalized.name && !normalized.email) {
      return
    }

    if (!normalized.code) {
      errors.push({ rowNumber, message: 'Mã học sinh là bắt buộc.' })
      return
    }

    if (!normalized.name) {
      errors.push({ rowNumber, message: 'Họ và tên là bắt buộc.' })
      return
    }

    if (seenCodes.has(normalized.code)) {
      errors.push({ rowNumber, message: `Mã học sinh ${normalized.code} bị trùng trong file.` })
      return
    }

    seenCodes.add(normalized.code)
    normalizedRows.push(normalized)
  })

  return { rows: normalizedRows, errors }
}
