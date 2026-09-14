import { apiClient } from './apiClient.js'
import { pathSegment } from './serviceUtils.js'

export function createAiEvaluationService({ api = apiClient } = {}) {
  return {
    createEvaluation(submissionId) {
      return api.post(`/api/submissions/${pathSegment(submissionId)}/ai-evaluation`)
    },

    getEvaluation(submissionId) {
      return api.get(`/api/submissions/${pathSegment(submissionId)}/ai-evaluation`)
    },
  }
}

export const aiEvaluationService = createAiEvaluationService()
