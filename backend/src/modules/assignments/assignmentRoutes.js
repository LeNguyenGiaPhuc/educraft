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

  router.get(
    '/classes/:classId/assignments',
    authenticate,
    requireRole('TEACHER'),
    validate(classIdParamsSchema),
    controller.list,
  )
  router.post(
    '/classes/:classId/assignments',
    authenticate,
    requireRole('TEACHER'),
    validate(createAssignmentSchema),
    controller.create,
  )
  router.get(
    '/assignments/:assignmentId',
    authenticate,
    requireRole('TEACHER'),
    validate(assignmentIdParamsSchema),
    controller.get,
  )
  router.patch(
    '/assignments/:assignmentId',
    authenticate,
    requireRole('TEACHER'),
    validate(updateAssignmentSchema),
    controller.update,
  )
  router.delete(
    '/assignments/:assignmentId',
    authenticate,
    requireRole('TEACHER'),
    validate(assignmentIdParamsSchema),
    controller.remove,
  )

  return router
}
