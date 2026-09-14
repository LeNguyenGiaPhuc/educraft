import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { submissionParamsSchema } from './submissionValidators.js'

export function createSubmissionRouter({ controller, authenticate, imageUpload }) {
  const router = Router()

  router.post(
    '/assignments/:assignmentId/submissions',
    authenticate,
    requireRole('STUDENT'),
    validate(submissionParamsSchema),
    imageUpload,
    controller.create,
  )

  return router
}
