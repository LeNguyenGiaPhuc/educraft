import { apiClient } from './apiClient.js'
import { createFileFormData, pathSegment } from './serviceUtils.js'

export function createReferenceService({ api = apiClient } = {}) {
  return {
    listReferences(assignmentId) {
      return api.get(`/api/assignments/${pathSegment(assignmentId)}/references`)
    },

    uploadReference(assignmentId, file, fileName) {
      const formData = createFileFormData(file, fileName)
      return api.upload(`/api/assignments/${pathSegment(assignmentId)}/references`, formData)
    },

    replaceReference(assignmentId, referenceId, file, fileName) {
      const formData = createFileFormData(file, fileName)
      return api.upload(
        `/api/assignments/${pathSegment(assignmentId)}/references/${pathSegment(referenceId)}`,
        formData,
        { method: 'PUT' },
      )
    },

    deleteReference(assignmentId, referenceId) {
      return api.delete(
        `/api/assignments/${pathSegment(assignmentId)}/references/${pathSegment(referenceId)}`,
      )
    },
  }
}

export const referenceService = createReferenceService()
