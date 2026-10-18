import { apiClient, ApiError, DEFAULT_API_BASE_URL } from './apiClient.js'
import { readEvaluationStream } from './aiEvaluationStream.js'
import { pathSegment } from './serviceUtils.js'

export function createAiEvaluationService({ api = apiClient, fetchImpl = fetch, baseUrl = DEFAULT_API_BASE_URL } = {}) {
  return {
    async streamEvaluation(submissionId, { signal, onProgress } = {}) {
      let response
      try {
        response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/api/submissions/${pathSegment(submissionId)}/ai-evaluation/stream`, {
          method: 'POST', credentials: 'include', headers: { Accept: 'text/event-stream' }, signal,
        })
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        throw new ApiError({ code: 'AI_STREAM_INTERRUPTED', message: 'Mất kết nối. AI có thể vẫn đang xử lý.', cause: error })
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        // A network failure or a service error must never trigger a second POST.
        if ((response.status === 404 && payload?.error?.code === 'NOT_FOUND')
          || response.status === 405 || response.status === 501) {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
          return api.post(`/api/submissions/${pathSegment(submissionId)}/ai-evaluation`)
        }
        throw new ApiError({ status: response.status, ...payload?.error })
      }
      return readEvaluationStream(response, { submissionId, signal, onProgress })
    },
    createEvaluation(submissionId) {
      return api.post(`/api/submissions/${pathSegment(submissionId)}/ai-evaluation`)
    },

    getEvaluation(submissionId) {
      return api.get(`/api/submissions/${pathSegment(submissionId)}/ai-evaluation`)
    },
  }
}

export const aiEvaluationService = createAiEvaluationService()
