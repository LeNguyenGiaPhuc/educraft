const USERS_STORAGE_KEY = 'educraft.users'
const SESSION_STORAGE_KEY = 'educraft.session'

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
})

export const roleLabels = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.TEACHER]: 'Giao vien',
  [ROLES.STUDENT]: 'Hoc sinh',
})

const defaultUsers = Object.freeze([
  {
    id: 'admin-minh',
    name: 'Nguyen Minh Admin',
    username: 'admin01',
    email: 'admin@educraft.test',
    password: 'admin123',
    role: ROLES.ADMIN,
    status: 'active',
    classIds: [],
  },
  {
    id: 'teacher-phuc',
    name: 'Tran Gia Phuc',
    username: 'teacher01',
    email: 'teacher@educraft.test',
    password: 'teacher123',
    role: ROLES.TEACHER,
    status: 'active',
    classIds: ['10A1', '10A2', '11A1'],
  },
  {
    id: 'teacher-ha',
    name: 'Nguyen Van A',
    username: 'teacher02',
    email: 'teacher02@educraft.test',
    password: 'teacher123',
    role: ROLES.TEACHER,
    status: 'active',
    classIds: ['10A1'],
  },
  {
    id: 'teacher-linh',
    name: 'Tran Van B',
    username: 'teacher03',
    email: 'teacher03@educraft.test',
    password: 'teacher123',
    role: ROLES.TEACHER,
    status: 'active',
    classIds: ['10A2'],
  },
  {
    id: 'student-binh',
    name: 'Nguyen An Binh',
    username: 'student01',
    email: 'student@educraft.test',
    password: 'student123',
    role: ROLES.STUDENT,
    status: 'active',
    classIds: ['10A1'],
    studentCode: 'HS260101',
  },
  {
    id: 'student-an',
    name: 'Nguyen Van An',
    username: 'student02',
    email: 'student02@educraft.test',
    password: 'student123',
    role: ROLES.STUDENT,
    status: 'active',
    classIds: ['10A1'],
    studentCode: 'HS260102',
  },
  {
    id: 'student-bao',
    name: 'Tran Van Binh',
    username: 'student03',
    email: 'student03@educraft.test',
    password: 'student123',
    role: ROLES.STUDENT,
    status: 'active',
    classIds: ['10A2'],
    studentCode: 'HS260103',
  },
  {
    id: 'student-cuong',
    name: 'Le Van Cuong',
    username: 'student04',
    email: 'student04@educraft.test',
    password: 'student123',
    role: ROLES.STUDENT,
    status: 'active',
    classIds: [],
    studentCode: 'HS260104',
  },
  {
    id: 'student-dung',
    name: 'Pham Hai Dung',
    username: 'student05',
    email: 'student05@educraft.test',
    password: 'student123',
    role: ROLES.STUDENT,
    status: 'locked',
    classIds: [],
    studentCode: 'HS260105',
  },
])

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

function cloneUser(user) {
  return {
    ...user,
    username: user.username ?? normalizeUsername(user.email?.split('@')[0] ?? user.id),
    classIds: [...(user.classIds ?? [])],
  }
}

function cloneUsers(users) {
  return users.map(cloneUser)
}

function unlockKnownDemoAdmin(users, storage = getBrowserStorage()) {
  const admin = users.find((user) => user.email === 'admin@educraft.test' && user.role === ROLES.ADMIN)

  if (!admin || admin.status !== 'locked') {
    return users
  }

  admin.status = 'active'
  writeUsers(users, storage)
  return users
}

function readUsers(storage = getBrowserStorage()) {
  if (!storage) {
    return cloneUsers(defaultUsers)
  }

  try {
    const value = storage.getItem(USERS_STORAGE_KEY)

    if (value === null) {
      return cloneUsers(defaultUsers)
    }

    const users = JSON.parse(value)

    if (!Array.isArray(users)) {
      return cloneUsers(defaultUsers)
    }

    const normalizedUsers = users.map((user) => ({
      ...user,
      username: user.username ?? normalizeUsername(user.email?.split('@')[0] ?? user.id),
      classIds: user.classIds ?? [],
    }))

    return unlockKnownDemoAdmin(normalizedUsers, storage)
  } catch {
    return cloneUsers(defaultUsers)
  }
}

function writeUsers(users, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function readSession(storage = getBrowserStorage()) {
  if (!storage) {
    return null
  }

  try {
    const value = storage.getItem(SESSION_STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeSession(session, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  if (!session) {
    storage.removeItem?.(SESSION_STORAGE_KEY)
    return
  }

  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeAccountForm(form = {}) {
  const email = normalizeEmail(form.email)
  const username = normalizeUsername(form.username ?? email?.split('@')[0])

  return {
    id: String(form.id ?? '').trim(),
    username,
    name: String(form.name ?? '').trim(),
    email,
    password: String(form.password ?? '').trim(),
    role: Object.values(ROLES).includes(form.role) ? form.role : ROLES.STUDENT,
    status: form.status === 'locked' ? 'locked' : 'active',
    classIds: Array.isArray(form.classIds) ? form.classIds.map(String) : [],
    studentCode: String(form.studentCode ?? '').trim().toUpperCase(),
  }
}

function validateAccount(form, users, currentId = null) {
  const errors = {}

  if (!form.name) {
    errors.name = 'Vui long nhap ho ten.'
  }

  if (!form.email) {
    errors.email = 'Vui long nhap email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email khong hop le.'
  } else if (users.some((user) => user.email === form.email && user.id !== currentId)) {
    errors.email = 'Email nay da ton tai.'
  }

  if (!currentId && form.password.length < 6) {
    errors.password = 'Mat khau can toi thieu 6 ky tu.'
  }

  return errors
}

function userWithoutPassword(user) {
  if (!user) {
    return null
  }

  const safeUser = cloneUser(user)
  delete safeUser.password
  return safeUser
}

export function getStoredUsers(storage = getBrowserStorage()) {
  return cloneUsers(readUsers(storage))
}

export function getCurrentUser(storage = getBrowserStorage()) {
  const session = readSession(storage)

  if (!session?.userId) {
    return null
  }

  const user = readUsers(storage).find((item) => item.id === session.userId)

  if (!user || user.status === 'locked') {
    writeSession(null, storage)
    return null
  }

  return userWithoutPassword(user)
}

export function loginWithMockCredentials(identifier, password, storage = getBrowserStorage()) {
  const normalizedEmail = normalizeEmail(identifier)
  const user = readUsers(storage).find((item) => item.email === normalizedEmail)

  if (!user || user.password !== password) {
    return {
      status: 'error',
      message: 'Email hoac mat khau khong dung.',
    }
  }

  if (user.status === 'locked') {
    return {
      status: 'error',
      message: 'Tai khoan dang bi khoa.',
    }
  }

  writeSession({ userId: user.id, loggedInAt: new Date().toISOString() }, storage)
  return { status: 'success', data: userWithoutPassword(user) }
}

export function logoutMockUser(storage = getBrowserStorage()) {
  writeSession(null, storage)
}

export function getRoleHome(role) {
  if (role === ROLES.ADMIN) {
    return '/admin'
  }

  if (role === ROLES.STUDENT) {
    return '/student'
  }

  return '/teacher'
}

export function canAccessRole(user, allowedRoles = []) {
  return Boolean(user && user.status !== 'locked' && allowedRoles.includes(user.role))
}

export function createMockAccount(form, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const normalized = normalizeAccountForm(form)
  const errors = validateAccount(normalized, users)

  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors }
  }

  const idBase = normalized.username.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
  const user = {
    id: `${normalized.role.toLowerCase()}-${idBase}-${Date.now().toString(36)}`,
    username: normalized.username,
    name: normalized.name,
    email: normalized.email,
    password: normalized.password,
    role: normalized.role,
    status: 'active',
    classIds: normalized.classIds,
    studentCode: normalized.studentCode,
  }

  writeUsers([...users, user], storage)
  return { status: 'success', data: cloneUser(user) }
}

export function updateMockAccount(userId, form, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const index = users.findIndex((user) => user.id === userId)

  if (index === -1) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  const normalized = normalizeAccountForm(form)
  const errors = validateAccount(normalized, users, userId)

  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors }
  }

  const updated = {
    ...users[index],
    username: normalized.username,
    name: normalized.name,
    email: normalized.email,
    role: normalized.role,
    classIds: normalized.classIds,
    studentCode: normalized.studentCode,
  }

  if (normalized.password) {
    updated.password = normalized.password
  }

  const nextUsers = [...users]
  nextUsers[index] = updated
  writeUsers(nextUsers, storage)
  return { status: 'success', data: cloneUser(updated) }
}

export function toggleMockAccountStatus(userId, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const user = users.find((item) => item.id === userId)

  if (!user) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  user.status = user.status === 'locked' ? 'active' : 'locked'
  writeUsers(users, storage)
  return { status: 'success', data: cloneUser(user) }
}

export function assignMockClass(classId, { teacherId = '', studentIds = [] } = {}, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const normalizedStudentIds = new Set(studentIds)
  const nextUsers = users.map((user) => {
    const classIds = new Set(user.classIds ?? [])

    if (user.role === ROLES.TEACHER) {
      if (user.id === teacherId) {
        classIds.add(classId)
      } else {
        classIds.delete(classId)
      }
    }

    if (user.role === ROLES.STUDENT) {
      if (normalizedStudentIds.has(user.id)) {
        classIds.add(classId)
      } else {
        classIds.delete(classId)
      }
    }

    return {
      ...user,
      classIds: [...classIds],
    }
  })

  writeUsers(nextUsers, storage)
  return { status: 'success', data: cloneUsers(nextUsers) }
}

export function getAdminSnapshot(state = 'success', classes = [], storage = getBrowserStorage()) {
  if (state === 'loading') {
    return { status: 'loading' }
  }

  if (state === 'error') {
    return {
      status: 'error',
      message: 'Khong the tai du lieu quan tri luc nay.',
    }
  }

  const users = getStoredUsers(storage)

  if (state === 'empty') {
    return { status: 'success', data: { users: [], classes: [] } }
  }

  return {
    status: 'success',
    data: {
      users,
      classes: classes.map((classroom) => ({
        ...classroom,
        teacher: users.find((user) => user.role === ROLES.TEACHER && user.classIds?.includes(classroom.id)) ?? null,
        students: users.filter((user) => user.role === ROLES.STUDENT && user.classIds?.includes(classroom.id)),
      })),
    },
  }
}
