import { apiClient } from './apiClient.js'

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

function normalizeRole(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeStatus(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizeUser(profile) {
  if (!profile) {
    return null
  }

  const name = profile.full_name ?? profile.fullName ?? profile.name ?? ''

  return {
    id: profile.id,
    email: profile.email ?? '',
    username: profile.username ?? '',
    name,
    fullName: name,
    role: normalizeRole(profile.role),
    status: normalizeStatus(profile.status),
    studentCode: profile.student_code ?? profile.studentCode ?? null,
  }
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
  if (!user || normalizeStatus(user.status) !== 'active') {
    return false
  }

  return allowedRoles.includes(normalizeRole(user.role))
}

function isUnauthorized(error) {
  return error?.status === 401 || error?.code === 'AUTH_REQUIRED'
}

export function createAuthService({ api = apiClient } = {}) {
  function readProfile(request) {
    return request.then(normalizeUser)
  }

  function me() {
    return readProfile(api.get('/api/auth/me'))
  }

  function refresh() {
    return readProfile(api.post('/api/auth/refresh'))
  }

  return {
    login(email, password) {
      return readProfile(api.post('/api/auth/login', { email, password }))
    },

    me,

    refresh,

    async restoreSession() {
      try {
        return await me()
      } catch (error) {
        if (!isUnauthorized(error)) {
          throw error
        }
      }

      try {
        return await refresh()
      } catch (error) {
        if (isUnauthorized(error)) {
          return null
        }

        throw error
      }
    },

    logout() {
      return api.post('/api/auth/logout')
    },
  }
}

export const authService = createAuthService()
