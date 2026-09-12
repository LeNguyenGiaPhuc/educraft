const ASSIGNMENTS_STORAGE_KEY = 'educraft.assignments'

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

function readAssignments(storage = getBrowserStorage()) {
  if (!storage) {
    return []
  }

  try {
    const value = storage.getItem(ASSIGNMENTS_STORAGE_KEY)
    const assignments = value ? JSON.parse(value) : []

    return Array.isArray(assignments) ? assignments : []
  } catch {
    return []
  }
}

function writeAssignments(assignments, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  storage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments))
}

function formatDueDate(dueAt) {
  const [date, time] = String(dueAt ?? '').split('T')
  const [year, month, day] = date.split('-')

  if (!year || !month || !day) {
    return String(dueAt ?? '')
  }

  return `${day}/${month}/${year}${time ? `, ${time}` : ''}`
}

export function getStoredAssignments(classId, storage = getBrowserStorage()) {
  return readAssignments(storage).filter((assignment) => assignment.classId === classId)
}

export function createStoredAssignment(form, storage = getBrowserStorage()) {
  const assignments = readAssignments(storage)
  const assignment = {
    id: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    classId: form.classId,
    title: String(form.title ?? '').trim(),
    dueDate: formatDueDate(form.dueAt),
    threshold: `${Number(form.threshold)}%`,
    submission: '0 học sinh đã nộp',
    status: 'Đang mở',
    statusTone: 'active',
  }

  writeAssignments([...assignments, assignment], storage)
  return assignment
}

export function deleteStoredAssignmentsForClass(classId, storage = getBrowserStorage()) {
  const assignments = readAssignments(storage)
  const removedAssignments = assignments.filter((assignment) => assignment.classId === classId)

  writeAssignments(
    assignments.filter((assignment) => assignment.classId !== classId),
    storage,
  )

  return removedAssignments
}
