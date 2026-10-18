import { apiClient } from './apiClient.js'

export function createAiUsageService({ api = apiClient } = {}) {
  let pending
  return {
    getSummary() {
      // Share concurrent loads, including StrictMode effect replay; allow later refreshes.
      pending ??= Promise.resolve().then(() => api.get('/api/admin/ai-usage'))
        .finally(() => { pending = undefined })
      return pending
    },
  }
}

export const aiUsageService = createAiUsageService()
