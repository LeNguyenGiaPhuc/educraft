import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  assignmentIdParamsSchema,
  classIdParamsSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
} from './assignmentValidators.js'

export function createAssignmentRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate, requireRole('TEACHER'))

  router.get(
    '/classes/:classId/assignments',
    validate(classIdParamsSchema),
    controller.list,
  )
  router.post(
    '/classes/:classId/assignments',
    validate(createAssignmentSchema),
    controller.create,
  )
  router.get(
    '/assignments/:assignmentId',
    validate(assignmentIdParamsSchema),
    controller.get,
  )
  router.patch(
    '/assignments/:assignmentId',
    validate(updateAssignmentSchema),
    controller.update,
  )
  router.delete(
    '/assignments/:assignmentId',
    validate(assignmentIdParamsSchema),
    controller.remove,
  )

  return router
}
