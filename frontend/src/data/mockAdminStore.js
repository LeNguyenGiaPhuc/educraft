import {
  assignMockClass,
  assignMockTeacher,
  activateMockAccount,
  createMockAccount,
  deleteMockAccount,
  getAdminSnapshot,
  getCurrentUser,
  getStoredUsers,
  materializeMockUsers,
  ROLES,
  previewMockStudentImport,
  provisionMockStudentsForClass,
  toggleMockAccountStatus,
  updateMockAccount,
} from './mockAuthStore.js'
import {
  createStoredClass,
  deleteStoredClass,
  getTeacherClasses,
  updateStoredClass,
} from './mockClassStore.js'
import { removeClassMembership } from './mockClassMembershipStore.js'

export const ADMIN_STATE = Object.freeze({
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  SUCCESS: 'success',
})

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

function ensureUsersAreStored(storage = getBrowserStorage()) {
  if (!storage || storage.getItem('educraft.users') !== null) {
    return
  }

  materializeMockUsers(storage)
}

export function getRequestedAdminState() {
  if (typeof window === 'undefined') {
    return ADMIN_STATE.SUCCESS
  }

  return new URLSearchParams(window.location.search).get('state') ?? ADMIN_STATE.SUCCESS
}

export function getAdminWorkspace(state = getRequestedAdminState(), storage) {
  return getAdminSnapshot(state, getTeacherClasses(storage), storage)
}

export function getAccountClassLabel(account, classes) {
  const ids = account.classIds ?? []

  if (account.role === ROLES.STUDENT && ids.length === 0) {
    return 'Chua phan lop'
  }

  if (ids.length === 0) {
    return 'Chua gan'
  }

  return ids
    .map((id) => classes.find((classroom) => classroom.id === id)?.id ?? id)
    .join(', ')
}

export function filterAdminAccounts(accounts, { query = '', role = 'all', classId = 'all' } = {}) {
  const normalizedQuery = query.trim().toLowerCase()

  return accounts.filter((account) => {
    const matchesQuery = !normalizedQuery ||
      account.username?.toLowerCase().includes(normalizedQuery) ||
      account.name.toLowerCase().includes(normalizedQuery)
    const matchesRole = role === 'all' || account.role === role
    const matchesClass = classId === 'all' || (account.classIds ?? []).includes(classId)

    return matchesQuery && matchesRole && matchesClass
  })
}

export function createAdminAccount(form) {
  return createMockAccount({
    ...form,
    email: form.email ?? '',
    classIds: Array.isArray(form.classIds) ? form.classIds : (form.classId ? [form.classId] : []),
  })
}

export function updateAdminAccount(accountId, form) {
  return updateMockAccount(accountId, {
    ...form,
    email: form.email ?? '',
    classIds: Array.isArray(form.classIds) ? form.classIds : (form.classId ? [form.classId] : (form.classIds ?? [])),
  })
}

export function toggleAdminAccountStatus(accountId, currentUserId = getCurrentUser()?.id) {
  if (accountId === currentUserId) {
    return {
      status: 'error',
      errors: { form: 'Không thể khóa tài khoản đang đăng nhập.' },
    }
  }

  return toggleMockAccountStatus(accountId)
}

export function activateAdminAccount(accountId, password = 'student123') {
  return activateMockAccount(accountId, password)
}

export function deleteAdminAccount(accountId, currentUserId = getCurrentUser()?.id) {
  if (accountId === currentUserId) {
    return {
      status: 'error',
      errors: { form: 'Không thể xóa tài khoản đang đăng nhập.' },
    }
  }

  return deleteMockAccount(accountId)
}

export function deleteAdminClass(classId, storage) {
  return deleteStoredClass(classId, storage)
}

export function getTeachers(accounts = getStoredUsers()) {
  return accounts.filter((account) => account.role === ROLES.TEACHER && account.status === 'active')
}

export function getStudents(accounts = getStoredUsers()) {
  return accounts.filter((account) => account.role === ROLES.STUDENT)
}

export function createAdminClass(form, storage) {
  const selectedTeacherId = form.teacherId ?? ''
  if (selectedTeacherId && !getTeachers(getStoredUsers(storage)).some((teacher) => teacher.id === selectedTeacherId)) {
    return { status: 'error', errors: { teacherId: 'Giáo viên không hợp lệ hoặc đang bị khóa.' } }
  }

  const result = createStoredClass({
    id: form.id,
    subject: form.name ?? form.subject,
    semester: form.semester || 'Hoc ky 1',
    schoolYear: form.schoolYear || 'Nam hoc 2026-2027',
    teacherId: selectedTeacherId,
  }, storage)

  if (result.status === 'error') {
    return result
  }

  assignMockClass(result.data.id, {
    teacherId: selectedTeacherId,
    studentIds: form.studentIds ?? [],
  }, storage)

  return result
}

export function updateAdminClass(classId, form, storage) {
  const selectedTeacherId = form.teacherId ?? ''
  if (selectedTeacherId && !getTeachers(getStoredUsers(storage)).some((teacher) => teacher.id === selectedTeacherId)) {
    return { status: 'error', errors: { teacherId: 'Giáo viên không hợp lệ hoặc đang bị khóa.' } }
  }

  const result = updateStoredClass(classId, {
    id: classId,
    subject: form.name ?? form.subject,
    semester: form.semester,
    schoolYear: form.schoolYear,
    teacherId: selectedTeacherId,
  }, storage)

  if (result.status === 'error') {
    return result
  }

  const teacherResult = assignMockTeacher(classId, selectedTeacherId, storage)

  if (teacherResult.status === 'error') {
    return teacherResult
  }

  return result
}

export function addStudentsToAdminClass(classId, studentIds, storage) {
  const snapshot = getAdminWorkspace(ADMIN_STATE.SUCCESS, storage)

  if (snapshot.status !== 'success') {
    return { status: 'error', errors: { form: 'Khong the tai du lieu lop.' } }
  }

  const classroom = snapshot.data.classes.find((item) => item.id === classId)

  if (!classroom) {
    return { status: 'error', errors: { form: 'Khong tim thay lop hoc.' } }
  }

  const currentStudentIds = classroom.students.map((student) => student.id)
  const mergedStudentIds = [...new Set([...currentStudentIds, ...studentIds])]

  assignMockClass(classId, {
    teacherId: classroom.teacher?.id ?? '',
    studentIds: mergedStudentIds,
  }, storage)

  return { status: 'success', data: mergedStudentIds }
}

export function removeStudentFromAdminClass(classId, studentId, storage) {
  ensureUsersAreStored(storage)
  const classroom = getAdminWorkspace(ADMIN_STATE.SUCCESS, storage).data?.classes
    ?.find((item) => item.id === String(classId ?? '').trim().toUpperCase())

  if (!classroom) {
    return { status: 'error', errors: { form: 'Khong tim thay lop hoc.' } }
  }

  removeClassMembership(classroom.id, studentId, storage)
  return { status: 'success', data: studentId }
}

export function previewAdminStudentImport(classId, rows, storage) {
  const normalizedClassId = String(classId ?? '').trim().toUpperCase()
  const classroom = getTeacherClasses(storage).find((item) => item.id === normalizedClassId)

  if (!classroom) {
    return {
      status: 'error',
      errors: [{ rowNumber: 1, message: 'Không tìm thấy lớp học.' }],
    }
  }

  return previewMockStudentImport(normalizedClassId, rows, storage)
}

export function importStudentsToAdminClass(classId, rows, storage) {
  const normalizedClassId = String(classId ?? '').trim().toUpperCase()
  const classroom = getTeacherClasses(storage).find((item) => item.id === normalizedClassId)

  if (!classroom) {
    return {
      status: 'error',
      errors: [{ rowNumber: 1, message: 'Không tìm thấy lớp học.' }],
    }
  }

  return provisionMockStudentsForClass(normalizedClassId, rows, storage)
}

export function filterAdminClasses(classes, { query = '', teacher = 'all' } = {}) {
  const normalizedQuery = query.trim().toLowerCase()

  return classes.filter((classroom) => {
    const teacherName = classroom.teacher?.name ?? ''
    const matchesQuery = !normalizedQuery ||
      classroom.id.toLowerCase().includes(normalizedQuery) ||
      classroom.name.toLowerCase().includes(normalizedQuery) ||
      teacherName.toLowerCase().includes(normalizedQuery)

    const matchesTeacher = teacher === 'all' || classroom.teacher?.id === teacher

    return matchesQuery && matchesTeacher
  })
}

export function filterStudents(students, query = '') {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return students
  }

  return students.filter((student) => (
    student.username?.toLowerCase().includes(normalizedQuery) ||
    student.name.toLowerCase().includes(normalizedQuery)
  ))
}
