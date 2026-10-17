import { apiClient } from './apiClient.js'

export function createAiUsageService({ api = apiClient } = {}) {
  let pending
  return {
    getSummary() {
      // Share in-flight requests, including React StrictMode's effect replay.
      pending ??= Promise.resolve().then(() => api.get('/api/admin/ai-usage'))
        .finally(() => { pending = undefined })
      return pending
    },
  }
}

export const aiUsageService = createAiUsageService()
