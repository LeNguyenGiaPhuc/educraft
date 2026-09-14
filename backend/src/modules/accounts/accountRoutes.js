import { Router } from 'express'

import { requireRole } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import {
  accountIdParamsSchema,
  accountListQuerySchema,
  createAccountSchema,
  updateAccountSchema,
} from './accountValidators.js'

export function createAccountRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate)
  router.use(requireRole('ADMIN'))

  router.get('/accounts', validate(accountListQuerySchema), controller.list)
  router.get('/accounts/:accountId', validate(accountIdParamsSchema), controller.get)
  router.post('/accounts', validate(createAccountSchema), controller.create)
  router.patch('/accounts/:accountId', validate(updateAccountSchema), controller.update)
  router.post('/accounts/:accountId/lock', validate(accountIdParamsSchema), controller.lock)
  router.post('/accounts/:accountId/unlock', validate(accountIdParamsSchema), controller.unlock)
  router.delete('/accounts/:accountId', validate(accountIdParamsSchema), controller.remove)

  return router
}
