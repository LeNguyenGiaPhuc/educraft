import {
  getClassMemberships,
  removeStudentMemberships,
  saveClassMemberships,
} from './mockClassMembershipStore.js'

const USERS_STORAGE_KEY = 'educraft.users'
const SESSION_STORAGE_KEY = 'educraft.session'

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
})

export const roleLabels = Object.freeze({
  [ROLES.ADMIN]: 'Quản trị',
  [ROLES.TEACHER]: 'Giáo viên',
  [ROLES.STUDENT]: 'Học sinh',
})

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  LOCKED: 'locked',
  PENDING: 'pending',
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

function removeTeacherFromStoredClasses(userId, storage) {
  if (!storage) {
    return
  }

  try {
    const storedClasses = storage.getItem('educraft.classes')
    const classes = storedClasses ? JSON.parse(storedClasses) : []

    if (!Array.isArray(classes)) {
      return
    }

    storage.setItem('educraft.classes', JSON.stringify(classes.map((classroom) => {
      if (classroom.teacherId !== userId) {
        return classroom
      }

      const updated = { ...classroom }
      delete updated.teacherId
      return updated
    })))
  } catch {
    // Class cleanup is optional for the mock account operation.
  }
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

function normalizePersonName(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
}

function normalizeImportRow(row = {}) {
  return {
    studentNumber: String(row.studentNumber ?? row.number ?? row.stt ?? '').trim(),
    name: String(row.name ?? row.fullName ?? '').trim(),
    email: normalizeEmail(row.email),
  }
}

function createUniqueUsername(email, users) {
  const base = normalizeUsername(email.split('@')[0]).replace(/[^a-z0-9_-]/gi, '-') || 'student'
  const used = new Set(users.map((user) => normalizeUsername(user.username)))

  if (!used.has(base)) {
    return base
  }

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

function createUniqueStudentId(email, users, index) {
  const emailSlug = email.split('@')[0].replace(/[^a-z0-9_-]/gi, '-').toLowerCase() || 'student'
  const base = `student-${emailSlug}-${Date.now().toString(36)}-${index + 1}`
  const used = new Set(users.map((user) => user.id))
  let id = base
  let suffix = 2

  while (used.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }

  return id
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

export function materializeMockUsers(storage = getBrowserStorage()) {
  const users = readUsers(storage)

  if (storage && storage.getItem(USERS_STORAGE_KEY) === null) {
    writeUsers(users, storage)
  }

  return cloneUsers(users)
}

export function getCurrentUser(storage = getBrowserStorage()) {
  const session = readSession(storage)

  if (!session?.userId) {
    return null
  }

  const user = readUsers(storage).find((item) => item.id === session.userId)

  if (!user || user.status !== 'active') {
    writeSession(null, storage)
    return null
  }

  return userWithoutPassword(user)
}

export function loginWithMockCredentials(identifier, password, storage = getBrowserStorage()) {
  const normalizedEmail = normalizeEmail(identifier)
  const user = readUsers(storage).find((item) => item.email === normalizedEmail)

  if (user?.status === 'pending') {
    return {
      status: 'error',
      message: 'Tài khoản chưa được kích hoạt.',
    }
  }

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
  return Boolean(user && user.status === 'active' && allowedRoles.includes(user.role))
}

function buildStudentImportPlan(classId, rows = [], storage = getBrowserStorage()) {
  const normalizedClassId = String(classId ?? '').trim().toUpperCase()
  const users = readUsers(storage)
  const errors = []
  const warnings = []
  const entries = []
  const seenEmails = new Set()

  if (!normalizedClassId) {
    errors.push({ rowNumber: 1, message: 'Mã lớp là bắt buộc.' })
  }

  rows.forEach((row, index) => {
    const normalized = normalizeImportRow(row)
    const rowNumber = Number(row.rowNumber) || index + 2

    if (!normalized.name && !normalized.email && !normalized.studentNumber) {
      return
    }

    if (!normalized.name) {
      errors.push({ rowNumber, message: 'Họ và tên là bắt buộc.' })
    }

    if (!normalized.studentNumber) {
      errors.push({ rowNumber, message: 'STT là bắt buộc.' })
    } else if (!/^\d+$/.test(normalized.studentNumber) || Number(normalized.studentNumber) < 1) {
      errors.push({ rowNumber, message: 'STT phải là số nguyên dương.' })
    }

    if (!normalized.email) {
      errors.push({ rowNumber, message: 'Email là bắt buộc.' })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
      errors.push({ rowNumber, message: 'Email không hợp lệ.' })
    } else if (seenEmails.has(normalized.email)) {
      errors.push({ rowNumber, message: `Email ${normalized.email} bị trùng trong file.` })
    }

    if (!normalized.studentNumber || !/^\d+$/.test(normalized.studentNumber) || Number(normalized.studentNumber) < 1 || !normalized.name || !normalized.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email) || seenEmails.has(normalized.email)) {
      return
    }

    seenEmails.add(normalized.email)
    const existingUser = users.find((user) => user.email === normalized.email)

    if (!existingUser) {
      entries.push({
        kind: 'new',
        name: normalized.name,
        email: normalized.email,
        studentNumber: normalized.studentNumber,
        status: 'pending',
        message: 'Tạo tài khoản học sinh mới (chờ kích hoạt).',
      })
      return
    }

    if (existingUser.role !== ROLES.STUDENT) {
      errors.push({
        rowNumber,
        message: `Email ${normalized.email} đang thuộc tài khoản ${roleLabels[existingUser.role] ?? existingUser.role}.`,
      })
      return
    }

    if (normalizePersonName(existingUser.name) !== normalizePersonName(normalized.name)) {
      errors.push({
        rowNumber,
        message: `Email ${normalized.email} đã tồn tại nhưng họ tên không khớp với tài khoản hiện tại.`,
      })
      return
    }

    const alreadyInClass = (existingUser.classIds ?? []).includes(normalizedClassId)
    const warning = existingUser.status === 'locked'
      ? 'Tài khoản đang bị khóa; thêm vào lớp nhưng vẫn giữ trạng thái khóa.'
      : ''

    entries.push({
      kind: alreadyInClass ? 'skipped' : 'existing',
      accountId: existingUser.id,
      name: normalized.name,
      email: normalized.email,
      studentNumber: normalized.studentNumber,
      status: existingUser.status,
      message: alreadyInClass ? 'Học sinh đã có trong lớp, sẽ bỏ qua.' : 'Tài khoản hiện có sẽ được thêm vào lớp.',
      warning,
    })

    if (warning) {
      warnings.push({ rowNumber, message: warning })
    }
  })

  const summary = {
    total: entries.length,
    newAccounts: entries.filter((entry) => entry.kind === 'new').length,
    existingAccounts: entries.filter((entry) => entry.kind === 'existing').length,
    alreadyInClass: entries.filter((entry) => entry.kind === 'skipped').length,
    errors: errors.length,
  }

  return {
    classId: normalizedClassId,
    entries,
    errors,
    warnings,
    summary,
  }
}

export function previewMockStudentImport(classId, rows, storage = getBrowserStorage()) {
  return {
    status: 'success',
    data: buildStudentImportPlan(classId, rows, storage),
  }
}

export function provisionMockStudentsForClass(classId, rows, storage = getBrowserStorage()) {
  const plan = buildStudentImportPlan(classId, rows, storage)

  if (plan.errors.length > 0) {
    return {
      status: 'error',
      errors: plan.errors,
      warnings: plan.warnings,
      data: plan,
    }
  }

  const users = readUsers(storage)
  const nextUsers = users.map((user) => ({
    ...user,
    classIds: [...(user.classIds ?? [])],
  }))
  const addedEntries = []
  const assignedEntries = []

  plan.entries.forEach((entry, index) => {
    if (entry.kind === 'skipped') {
      return
    }

    if (entry.kind === 'new') {
      const user = {
        id: createUniqueStudentId(entry.email, nextUsers, index),
        username: createUniqueUsername(entry.email, nextUsers),
        name: entry.name,
        email: entry.email,
        password: '',
        role: ROLES.STUDENT,
        status: 'pending',
        classIds: [plan.classId],
        importSource: 'excel',
        importedStudentNumber: entry.studentNumber,
      }
      nextUsers.push(user)
      entry.accountId = user.id
      addedEntries.push(entry)
      return
    }

    const user = nextUsers.find((item) => item.id === entry.accountId)
    if (!user) {
      return
    }

    user.classIds = [...new Set([...(user.classIds ?? []), plan.classId])]
    user.importSource = user.importSource ?? 'excel'
    user.importedStudentNumber = user.importedStudentNumber ?? entry.studentNumber
    assignedEntries.push(entry)
  })

  writeUsers(nextUsers, storage)

  saveClassMemberships(
    plan.classId,
    plan.entries
      .filter((entry) => entry.kind !== 'skipped' || entry.accountId)
      .map((entry) => ({
        studentId: entry.accountId,
        studentNumber: entry.studentNumber,
      })),
    storage,
  )

  return {
    status: 'success',
    data: {
      ...plan,
      addedEntries,
      assignedEntries,
    },
    addedCount: addedEntries.length,
    assignedCount: assignedEntries.length,
    skippedCount: plan.summary.alreadyInClass,
    warnings: plan.warnings,
  }
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
    classIds: normalized.role === users[index].role ? normalized.classIds : [],
    studentCode: normalized.studentCode,
  }

  if (normalized.password) {
    updated.password = normalized.password
  }

  const nextUsers = [...users]
  nextUsers[index] = updated
  writeUsers(nextUsers, storage)

  if (normalized.role !== users[index].role) {
    if (users[index].role === ROLES.STUDENT) {
      removeStudentMemberships(userId, storage)
    }

    if (users[index].role === ROLES.TEACHER) {
      removeTeacherFromStoredClasses(userId, storage)
    }
  }

  return { status: 'success', data: cloneUser(updated) }
}

export function deleteMockAccount(userId, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const user = users.find((item) => item.id === userId)

  if (!user) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  writeUsers(users.filter((item) => item.id !== userId), storage)
  removeStudentMemberships(userId, storage)

  if (user.role === ROLES.TEACHER) {
    removeTeacherFromStoredClasses(userId, storage)
  }

  return { status: 'success', data: cloneUser(user) }
}

export function toggleMockAccountStatus(userId, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const user = users.find((item) => item.id === userId)

  if (!user) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  if (user.status === ACCOUNT_STATUS.PENDING) {
    return {
      status: 'error',
      errors: { form: 'Tài khoản đang chờ kích hoạt. Hãy kích hoạt trước.' },
    }
  }

  return user.status === ACCOUNT_STATUS.LOCKED
    ? unlockMockAccount(userId, storage)
    : lockMockAccount(userId, storage)
}

export function activateMockAccount(userId, password = 'student123', storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const user = users.find((item) => item.id === userId)

  if (!user) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  if (user.status !== ACCOUNT_STATUS.PENDING) {
    return { status: 'error', errors: { form: 'Tài khoản này không ở trạng thái chờ kích hoạt.' } }
  }

  if (String(password ?? '').trim().length < 6) {
    return { status: 'error', errors: { form: 'Mật khẩu cần tối thiểu 6 ký tự.' } }
  }

  user.password = String(password).trim()
  user.status = ACCOUNT_STATUS.ACTIVE
  writeUsers(users, storage)

  return { status: 'success', data: cloneUser(user) }
}

export function lockMockAccount(userId, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const user = users.find((item) => item.id === userId)

  if (!user) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  if (user.status !== ACCOUNT_STATUS.ACTIVE) {
    return { status: 'error', errors: { form: 'Chỉ tài khoản đang hoạt động mới có thể bị khóa.' } }
  }

  user.status = ACCOUNT_STATUS.LOCKED
  writeUsers(users, storage)
  return { status: 'success', data: cloneUser(user) }
}

export function unlockMockAccount(userId, storage = getBrowserStorage()) {
  const users = readUsers(storage)
  const user = users.find((item) => item.id === userId)

  if (!user) {
    return { status: 'error', errors: { form: 'Khong tim thay tai khoan.' } }
  }

  if (user.status !== ACCOUNT_STATUS.LOCKED) {
    return { status: 'error', errors: { form: 'Chỉ tài khoản bị khóa mới có thể mở khóa.' } }
  }

  user.status = ACCOUNT_STATUS.ACTIVE
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
  saveClassMemberships(
    classId,
    nextUsers
      .filter((user) => user.role === ROLES.STUDENT && normalizedStudentIds.has(user.id))
      .map((user) => ({
        studentId: user.id,
        studentNumber: user.importedStudentNumber,
      })),
    storage,
  )
  return { status: 'success', data: cloneUsers(nextUsers) }
}

export function assignMockTeacher(classId, teacherId = '', storage = getBrowserStorage()) {
  const normalizedClassId = String(classId ?? '').trim().toUpperCase()
  const users = readUsers(storage)
  const teacher = users.find((user) => user.id === teacherId && user.role === ROLES.TEACHER)

  if (teacherId && (!teacher || teacher.status !== ACCOUNT_STATUS.ACTIVE)) {
    return { status: 'error', errors: { form: 'Giáo viên không hợp lệ hoặc đang bị khóa.' } }
  }

  const nextUsers = users.map((user) => {
    if (user.role !== ROLES.TEACHER) {
      return user
    }

    const classIds = new Set(user.classIds ?? [])
    classIds.delete(normalizedClassId)

    if (user.id === teacherId) {
      classIds.add(normalizedClassId)
    }

    return { ...user, classIds: [...classIds] }
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
  const usersById = new Map(users.map((user) => [user.id, user]))

  if (state === 'empty') {
    return { status: 'success', data: { users: [], classes: [] } }
  }

  return {
    status: 'success',
    data: {
      users,
      classes: classes.map((classroom) => {
        const teacher = classroom.teacherId
          ? users.find((user) => user.id === classroom.teacherId && user.role === ROLES.TEACHER && user.status === ACCOUNT_STATUS.ACTIVE)
          : users.find((user) => user.role === ROLES.TEACHER && user.status === ACCOUNT_STATUS.ACTIVE && user.classIds?.includes(classroom.id))

        const memberships = getClassMemberships(classroom.id, storage)
        const students = memberships.length > 0
          ? memberships
              .map((membership) => {
                const student = usersById.get(membership.studentId)
                return student ? { ...student, importedStudentNumber: membership.studentNumber || student.importedStudentNumber } : null
              })
              .filter(Boolean)
          : users.filter((user) => user.role === ROLES.STUDENT && user.classIds?.includes(classroom.id))

        return {
          ...classroom,
          teacher: teacher ?? null,
          students,
        }
      }),
    },
  }
}
