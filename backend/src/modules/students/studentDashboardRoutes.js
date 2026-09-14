import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { assignmentIdParamsSchema } from '../assignments/assignmentValidators.js'

export function createStudentDashboardRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate, requireRole('STUDENT'))
  router.get('/dashboard', controller.getDashboard)
  router.get(
    '/assignments/:assignmentId',
    validate(assignmentIdParamsSchema),
    controller.getAssignment,
  )

  return router
}
