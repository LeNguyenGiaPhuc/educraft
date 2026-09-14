import { apiClient } from './apiClient.js'
import { pathSegment } from './serviceUtils.js'

export function createAssignmentService({ api = apiClient } = {}) {
  return {
    listAssignments(classId) {
      return api.get(`/api/classes/${pathSegment(classId)}/assignments`)
    },

    createAssignment(classId, input) {
      return api.post(`/api/classes/${pathSegment(classId)}/assignments`, input)
    },

    getAssignment(assignmentId) {
      return api.get(`/api/assignments/${pathSegment(assignmentId)}`)
    },

    updateAssignment(assignmentId, input) {
      return api.patch(`/api/assignments/${pathSegment(assignmentId)}`, input)
    },

    deleteAssignment(assignmentId) {
      return api.delete(`/api/assignments/${pathSegment(assignmentId)}`)
    },
  }
}

export const assignmentService = createAssignmentService()
