import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  finalizeSubmissionSchema,
  submissionDetailParamsSchema,
  submissionParamsSchema,
} from './submissionValidators.js'

export function createSubmissionRouter({ controller, authenticate, imageUpload }) {
  const router = Router()

  router.get(
    '/assignments/:assignmentId/my-submissions',
    authenticate,
    requireRole('STUDENT'),
    validate(submissionParamsSchema),
    controller.listOwn,
  )
  router.get(
    '/assignments/:assignmentId/submissions',
    authenticate,
    requireRole('TEACHER'),
    validate(submissionParamsSchema),
    controller.listForTeacher,
  )
  router.post(
    '/assignments/:assignmentId/submissions',
    authenticate,
    requireRole('STUDENT'),
    validate(submissionParamsSchema),
    imageUpload,
    controller.create,
  )
  router.get(
    '/submissions/:submissionId',
    authenticate,
    requireRole('STUDENT', 'TEACHER'),
    validate(submissionDetailParamsSchema),
    controller.get,
  )
  router.patch(
    '/submissions/:submissionId/review',
    authenticate,
    requireRole('TEACHER'),
    validate(finalizeSubmissionSchema),
    controller.finalize,
  )

  return router
}
