import { Router } from 'express'

import { validate } from '../../middleware/validate.js'
import { loginSchema } from './authValidators.js'

export function createAuthRouter({ controller, authenticate }) {
  const router = Router()

  router.post('/login', validate(loginSchema), controller.login)
  router.post('/refresh', controller.refresh)
  router.post('/logout', controller.logout)
  router.get('/me', authenticate, controller.me)
  return router
}
