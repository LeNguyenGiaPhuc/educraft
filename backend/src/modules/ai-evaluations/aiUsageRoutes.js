import { Router } from 'express'

import { AppError } from '../../common/errors.js'
import { sendData } from '../../common/response.js'
import { requireRole } from '../../middleware/authorize.js'

// Transport only. The log-backed summary service belongs to member 2.
export function createAiUsageRouter({ authenticate, aiUsageService }) {
  const router = Router()
  router.get('/ai-usage', authenticate, requireRole('ADMIN'), async (request, response) => {
    if (!aiUsageService) {
      throw new AppError(503, 'AI_USAGE_UNAVAILABLE', 'Thống kê AI chưa được kết nối với log đã lưu.')
    }
    return sendData(response, await aiUsageService.getSummary(request.auth))
  })
  return router
}
