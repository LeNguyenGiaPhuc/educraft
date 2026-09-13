import {
  assignMockClass,
  createMockAccount,
  getAdminSnapshot,
  getCurrentUser,
  getStoredUsers,
  ROLES,
  toggleMockAccountStatus,
  updateMockAccount,
} from './mockAuthStore.js'
import { createStoredClass, deleteStoredClass, getTeacherClasses } from './mockClassStore.js'

export const ADMIN_STATE = Object.freeze({
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  SUCCESS: 'success',
})

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

export function deleteAdminClass(classId) {
  return deleteStoredClass(classId)
}

export function getTeachers(accounts = getStoredUsers()) {
  return accounts.filter((account) => account.role === ROLES.TEACHER)
}

export function getStudents(accounts = getStoredUsers()) {
  return accounts.filter((account) => account.role === ROLES.STUDENT)
}

export function createAdminClass(form) {
  const result = createStoredClass({
    id: form.id,
    subject: form.name,
    semester: form.semester || 'Hoc ky 1',
    schoolYear: form.schoolYear || 'Nam hoc 2026-2027',
  })

  if (result.status === 'error') {
    return result
  }

  assignMockClass(result.data.id, {
    teacherId: form.teacherId,
    studentIds: form.studentIds ?? [],
  })

  return result
}

export function addStudentsToAdminClass(classId, studentIds) {
  const snapshot = getAdminWorkspace(ADMIN_STATE.SUCCESS)

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
  })

  return { status: 'success', data: mergedStudentIds }
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
