import { apiClient } from './apiClient.js'
import { pathSegment } from './serviceUtils.js'

export function createAdminClassService({ api = apiClient } = {}) {
  function buildClassQuery(query = {}) {
    const params = new URLSearchParams()

    if (query.search) {
      params.set('search', query.search)
    }

    if (query.status && query.status !== 'all') {
      params.set('status', query.status)
    }

    const suffix = params.toString()
    return suffix ? `/api/admin/classes?${suffix}` : '/api/admin/classes'
  }

  return {
    listClasses(query = {}) {
      return api.get(buildClassQuery(query))
    },

    getClass(classId) {
      return api.get(`/api/admin/classes/${pathSegment(classId)}`)
    },

    listStudents(classId) {
      return api.get(`/api/admin/classes/${pathSegment(classId)}/students`)
    },

    createClass(input) {
      return api.post('/api/admin/classes', input)
    },

    updateClass(classId, input) {
      return api.patch(`/api/admin/classes/${pathSegment(classId)}`, input)
    },

    deleteClass(classId) {
      return api.delete(`/api/admin/classes/${pathSegment(classId)}`)
    },

    assignTeacher(classId, input) {
      return api.post(`/api/admin/classes/${pathSegment(classId)}/teacher`, input)
    },

    addStudent(classId, input) {
      return api.post(`/api/admin/classes/${pathSegment(classId)}/students`, input)
    },

    removeStudent(classId, input) {
      return api.delete(`/api/admin/classes/${pathSegment(classId)}/students`, { body: input })
    },

    importStudents(classId, input) {
      return api.post(`/api/admin/classes/${pathSegment(classId)}/import-students`, input)
    },
  }
}

export const adminClassService = createAdminClassService()
