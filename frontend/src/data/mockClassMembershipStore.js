const MEMBERSHIPS_STORAGE_KEY = 'educraft.classMemberships'
const USERS_STORAGE_KEY = 'educraft.users'

function normalizeClassId(classId) {
  return String(classId ?? '').trim().toUpperCase()
}

function readJson(storage, key, fallback) {
  if (!storage) {
    return fallback
  }

  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function readStoredMemberships(storage) {
  if (!storage) {
    return null
  }

  try {
    const value = storage.getItem(MEMBERSHIPS_STORAGE_KEY)

    if (value === null) {
      return null
    }

    const memberships = JSON.parse(value)
    return Array.isArray(memberships) ? memberships : []
  } catch {
    return []
  }
}

function readUsers(storage) {
  const users = readJson(storage, USERS_STORAGE_KEY, [])
  return Array.isArray(users) ? users : []
}

function normalizeMembership(classId, membership = {}) {
  return {
    classId: normalizeClassId(classId),
    studentId: String(membership.studentId ?? membership.userId ?? '').trim(),
    studentNumber: String(membership.studentNumber ?? membership.number ?? '').trim(),
  }
}

function migrateMembershipsFromUsers(storage) {
  return readUsers(storage).flatMap((user) => {
    if (user.role !== 'STUDENT') {
      return []
    }

    return (user.classIds ?? []).map((classId) => normalizeMembership(classId, {
      studentId: user.id,
      studentNumber: user.importedStudentNumber,
    }))
  }).filter((membership) => membership.studentId && membership.classId)
}

function getAllMemberships(storage) {
  return readStoredMemberships(storage) ?? migrateMembershipsFromUsers(storage)
}

function writeMemberships(memberships, storage) {
  if (!storage) {
    return
  }

  storage.setItem(MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships))
}

function addClassIdToUsers(classId, studentIds, storage) {
  if (!storage) {
    return
  }

  const users = readUsers(storage)
  if (users.length === 0) {
    return
  }

  const selectedIds = new Set(studentIds)
  const nextUsers = users.map((user) => {
    if (user.role !== 'STUDENT' || !selectedIds.has(user.id)) {
      return user
    }

    return {
      ...user,
      classIds: [...new Set([...(user.classIds ?? []), classId])],
    }
  })

  storage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers))
}

export function getClassMemberships(classId, storage) {
  const normalizedClassId = normalizeClassId(classId)

  return getAllMemberships(storage)
    .filter((membership) => membership.classId === normalizedClassId)
    .map((membership) => normalizeMembership(normalizedClassId, membership))
    .filter((membership) => membership.studentId)
}

export function getStudentMemberships(studentId, storage) {
  const normalizedStudentId = String(studentId ?? '').trim()

  return getAllMemberships(storage)
    .filter((membership) => membership.studentId === normalizedStudentId)
    .map((membership) => normalizeMembership(membership.classId, membership))
}

export function saveClassMemberships(classId, records = [], storage) {
  const normalizedClassId = normalizeClassId(classId)
  const allMemberships = getAllMemberships(storage)
  const nextByStudent = new Map(
    allMemberships
      .filter((membership) => membership.classId === normalizedClassId)
      .map((membership) => [membership.studentId, normalizeMembership(normalizedClassId, membership)]),
  )

  records.forEach((record) => {
    const membership = normalizeMembership(normalizedClassId, record)
    if (membership.studentId) {
      nextByStudent.set(membership.studentId, membership)
    }
  })

  const nextMemberships = [
    ...allMemberships.filter((membership) => membership.classId !== normalizedClassId),
    ...nextByStudent.values(),
  ]

  writeMemberships(nextMemberships, storage)
  addClassIdToUsers(normalizedClassId, [...nextByStudent.keys()], storage)

  return getClassMemberships(normalizedClassId, storage)
}

export const addClassMemberships = saveClassMemberships

export function removeClassMembershipsForClass(classId, storage) {
  const normalizedClassId = normalizeClassId(classId)
  const nextMemberships = getAllMemberships(storage)
    .filter((membership) => membership.classId !== normalizedClassId)

  writeMemberships(nextMemberships, storage)

  if (storage) {
    const users = readUsers(storage)
    if (users.length > 0) {
      storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users.map((user) => ({
        ...user,
        classIds: (user.classIds ?? []).filter((id) => normalizeClassId(id) !== normalizedClassId),
      }))))
    }
  }

  return nextMemberships
}

export const deleteMembershipsForClass = removeClassMembershipsForClass

export function removeClassMembership(classId, studentId, storage) {
  const normalizedClassId = normalizeClassId(classId)
  const normalizedStudentId = String(studentId ?? '').trim()
  const nextMemberships = getAllMemberships(storage).filter((membership) => (
    membership.classId !== normalizedClassId || membership.studentId !== normalizedStudentId
  ))

  writeMemberships(nextMemberships, storage)

  if (storage) {
    const users = readUsers(storage)
    storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users.map((user) => (
      user.id === normalizedStudentId
        ? { ...user, classIds: (user.classIds ?? []).filter((id) => normalizeClassId(id) !== normalizedClassId) }
        : user
    ))))
  }

  return getClassMemberships(normalizedClassId, storage)
}

export function removeStudentMemberships(studentId, storage) {
  const normalizedStudentId = String(studentId ?? '').trim()
  const nextMemberships = getAllMemberships(storage).filter(
    (membership) => membership.studentId !== normalizedStudentId,
  )

  writeMemberships(nextMemberships, storage)
  return nextMemberships
}
