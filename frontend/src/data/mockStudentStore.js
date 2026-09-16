import { getStoredUsers, ROLES } from './mockAuthStore.js'
import { getClassMemberships } from './mockClassMembershipStore.js'
import { validateStudentRows } from './studentValidation.js'
export { validateStudentRows } from './studentValidation.js'

const STUDENTS_STORAGE_KEY = 'educraft.students'
const USERS_STORAGE_KEY = 'educraft.users'

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

function hasStoredAuthUsers(storage = getBrowserStorage()) {
  if (!storage) {
    return false
  }

  try {
    return Boolean(storage.getItem(USERS_STORAGE_KEY))
  } catch {
    return false
  }
}

function getAuthStudents(classId, storage = getBrowserStorage()) {
  if (!hasStoredAuthUsers(storage)) {
    return []
  }

  const users = getStoredUsers(storage)
  const usersById = new Map(users.map((student) => [student.id, student]))

  return getClassMemberships(classId, storage)
    .map((membership) => ({
      user: usersById.get(membership.studentId),
      number: membership.studentNumber,
    }))
    .filter(({ user }) => user?.role === ROLES.STUDENT)
    .map(({ user, number }) => ({
      id: user.id,
      number: number || user.importedStudentNumber,
      name: user.name,
      code: user.studentCode || user.email,
      email: user.email,
      latestSubmission: 'Chưa nộp',
      status: user.status,
    }))
}

function mergeStudentViews(students, importedStudents) {
  const merged = [...students]
  const existingKeys = new Set(merged.map((student) => student.code || student.email || student.id))

  importedStudents.forEach((student) => {
    const key = student.code || student.email || student.id
    if (!existingKeys.has(key)) {
      merged.push(student)
      existingKeys.add(key)
    }
  })

  return merged
}

export function getStoredStudents(classId, storage = getBrowserStorage()) {
  return readStudents(storage)
    .filter((student) => student.classId === classId)
    .map((student) => ({ ...student }))
}

export function getClassStudents(classId, fallbackRows = [], storage = getBrowserStorage()) {
  const storedStudents = getStoredStudents(classId, storage)
  const authStudents = getAuthStudents(classId, storage)

  if (hasStoredAuthUsers(storage)) {
    return authStudents
  }

  if (storedStudents.length > 0) {
    return mergeStudentViews(storedStudents, authStudents)
  }

  return mergeStudentViews(
    fallbackRows.map((student) => ({ ...student })),
    authStudents,
  )
}

export function getClassStudentCount(classId, fallbackCount, storage = getBrowserStorage()) {
  const students = getClassStudents(classId, [], storage)
  return students.length > 0 ? students.length : fallbackCount
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
