import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  referenceAssignmentParamsSchema,
  referenceParamsSchema,
} from './referenceValidators.js'

export function createReferenceRouter({ controller, authenticate, imageUpload }) {
  const router = Router()

  router.get(
    '/assignments/:assignmentId/references',
    authenticate,
    requireRole('TEACHER'),
    validate(referenceAssignmentParamsSchema),
    controller.list,
  )
  router.post(
    '/assignments/:assignmentId/references',
    authenticate,
    requireRole('TEACHER'),
    validate(referenceAssignmentParamsSchema),
    imageUpload,
    controller.create,
  )
  router.put(
    '/assignments/:assignmentId/references/:referenceId',
    authenticate,
    requireRole('TEACHER'),
    validate(referenceParamsSchema),
    imageUpload,
    controller.replace,
  )
  router.delete(
    '/assignments/:assignmentId/references/:referenceId',
    authenticate,
    requireRole('TEACHER'),
    validate(referenceParamsSchema),
    controller.remove,
  )

  return router
}
