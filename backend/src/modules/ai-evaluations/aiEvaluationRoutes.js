import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { aiEvaluationParamsSchema } from './aiEvaluationValidators.js'

export function createAiEvaluationRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate, requireRole('TEACHER'))
  router.post(
    '/submissions/:submissionId/ai-evaluation',
    validate(aiEvaluationParamsSchema),
    controller.create,
  )
  router.get(
    '/submissions/:submissionId/ai-evaluation',
    validate(aiEvaluationParamsSchema),
    controller.get,
  )

  return router
}
