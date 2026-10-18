import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'

export function createAiUsageRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate, requireRole('ADMIN'))
  router.get('/ai-usage', controller.getSummary)

  return router
}
