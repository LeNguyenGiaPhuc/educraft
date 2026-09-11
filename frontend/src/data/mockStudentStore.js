const STUDENTS_STORAGE_KEY = 'educraft.students'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readStudents(storage = getBrowserStorage()) {
  if (!storage) {
    return []
  }

  try {
    const value = storage.getItem(STUDENTS_STORAGE_KEY)
    const students = value ? JSON.parse(value) : []

    return Array.isArray(students) ? students : []
  } catch {
    return []
  }
}

function writeStudents(students, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  storage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students))
}

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

export function getStoredStudents(classId, storage = getBrowserStorage()) {
  return readStudents(storage)
    .filter((student) => student.classId === classId)
    .map((student) => ({ ...student }))
}

export function getClassStudents(classId, fallbackRows = [], storage = getBrowserStorage()) {
  const storedStudents = getStoredStudents(classId, storage)

  if (storedStudents.length > 0) {
    return storedStudents
  }

  return fallbackRows.map((student) => ({ ...student }))
}

export function getClassStudentCount(classId, fallbackCount, storage = getBrowserStorage()) {
  const storedStudents = getStoredStudents(classId, storage)
  return storedStudents.length > 0 ? storedStudents.length : fallbackCount
}

export function deleteStoredStudentsForClass(classId, storage = getBrowserStorage()) {
  const normalizedClassId = String(classId ?? '').trim().toUpperCase()
  const allStudents = readStudents(storage)
  const removedStudents = allStudents.filter((student) => student.classId === normalizedClassId)

  writeStudents(
    allStudents.filter((student) => student.classId !== normalizedClassId),
    storage,
  )

  return removedStudents.map((student) => ({ ...student }))
}

export function mergeStudentRows(classId, rows, storage = getBrowserStorage()) {
  const validation = validateStudentRows(rows)

  if (validation.errors.length > 0) {
    return {
      status: 'error',
      errors: validation.errors,
    }
  }

  const allStudents = readStudents(storage)
  const existingStudents = allStudents.filter((student) => student.classId === classId)
  const existingCodes = new Set(existingStudents.map((student) => student.code))
  const importedStudents = validation.rows
    .filter((student) => !existingCodes.has(student.code))
    .map((student) => ({
      id: student.code,
      classId,
      code: student.code,
      name: student.name,
      email: student.email,
      latestSubmission: 'Chưa nộp',
    }))

  writeStudents(
    [
      ...allStudents,
      ...importedStudents,
    ],
    storage,
  )

  return {
    status: 'success',
    data: [...existingStudents, ...importedStudents],
    addedCount: importedStudents.length,
    skippedCount: validation.rows.length - importedStudents.length,
  }
}
