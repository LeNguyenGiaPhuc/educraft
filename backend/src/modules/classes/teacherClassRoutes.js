import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { classIdParamsSchema } from './classValidators.js'

export function createTeacherClassRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate, requireRole('TEACHER'))
  router.get('/classes', controller.list)
  router.get('/classes/:classId', validate(classIdParamsSchema), controller.get)

  return router
}
