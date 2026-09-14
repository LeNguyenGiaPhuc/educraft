import { createSupabaseGateway } from './config/supabase.js'
import { createAuthenticate } from './middleware/authenticate.js'
import { createAssignmentController } from './modules/assignments/assignmentController.js'
import { createAssignmentRouter } from './modules/assignments/assignmentRoutes.js'
import { createAssignmentService } from './modules/assignments/assignmentService.js'
import { createAuthController } from './modules/auth/authController.js'
import { createAuthRouter } from './modules/auth/authRoutes.js'
import { createAuthService } from './modules/auth/authService.js'

export function createDependencies(config) {
  const gateway = createSupabaseGateway(config)
  const authService = createAuthService(gateway)
  const authenticate = createAuthenticate(gateway)
  const assignmentService = createAssignmentService()
  const assignmentController = createAssignmentController({ assignmentService })
  const assignmentRouter = createAssignmentRouter({
    controller: assignmentController,
    authenticate,
  })
  const authController = createAuthController({
    authService,
    nodeEnv: config.NODE_ENV,
  })
  const authRouter = createAuthRouter({
    controller: authController,
    authenticate,
  })

  return { assignmentRouter, authRouter, authenticate, gateway }
}
