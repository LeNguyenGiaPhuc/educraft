import { apiClient } from './apiClient.js'
import { createFileFormData, pathSegment } from './serviceUtils.js'

export function createSubmissionService({ api = apiClient } = {}) {
  return {
    createSubmission(assignmentId, file, fileName) {
      const formData = createFileFormData(file, fileName)
      return api.upload(`/api/assignments/${pathSegment(assignmentId)}/submissions`, formData)
    },

    listMySubmissions(assignmentId) {
      return api.get(`/api/assignments/${pathSegment(assignmentId)}/my-submissions`)
    },

    listSubmissions(assignmentId) {
      return api.get(`/api/assignments/${pathSegment(assignmentId)}/submissions`)
    },

    getSubmission(submissionId) {
      return api.get(`/api/submissions/${pathSegment(submissionId)}`)
    },

    finalizeSubmission(submissionId, input) {
      return api.patch(`/api/submissions/${pathSegment(submissionId)}/review`, input)
    },
  }
}

export const submissionService = createSubmissionService()
