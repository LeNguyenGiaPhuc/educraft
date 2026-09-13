export const DEFAULT_DEMO_ROLE = 'teacher'

// Demo selection only; this is not an authentication session.
const DEMO_ROLE_STORAGE_KEY = 'educraft.demoRole'

function getSessionStorage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function readDemoRole(storage = getSessionStorage()) {
  try {
    const role = storage?.getItem(DEMO_ROLE_STORAGE_KEY)
    return ['teacher', 'student'].includes(role) ? role : DEFAULT_DEMO_ROLE
  } catch {
    return DEFAULT_DEMO_ROLE
  }
}

export function writeDemoRole(role, storage = getSessionStorage()) {
  if (!storage || !['teacher', 'student'].includes(role)) {
    return false
  }

  try {
    storage.setItem(DEMO_ROLE_STORAGE_KEY, role)
    return true
  } catch {
    return false
  }
}

const mockUsers = Object.freeze({
  teacher: Object.freeze({
    id: 'mock-teacher-gp',
    role: 'teacher',
    studentId: null,
    name: 'Gia Phúc',
  }),
  student: Object.freeze({
    id: 'mock-student-hs260101',
    role: 'student',
    studentId: 'HS260101',
    name: 'Nguyễn An Bình',
  }),
})

export function getMockUser(role = DEFAULT_DEMO_ROLE) {
  return Object.hasOwn(mockUsers, role) ? mockUsers[role] : null
}

export function canAccessRole(user, requiredRole) {
  if (
    !['teacher', 'student'].includes(requiredRole)
    || user?.role !== requiredRole
    || typeof user.id !== 'string'
    || !user.id.trim()
    || typeof user.name !== 'string'
    || !user.name.trim()
  ) {
    return false
  }

  return requiredRole !== 'student'
    || (typeof user.studentId === 'string' && Boolean(user.studentId.trim()))
}

export function getRoleHome(user) {
  if (canAccessRole(user, 'teacher')) {
    return '/'
  }

  return canAccessRole(user, 'student') ? '/student' : null
}
