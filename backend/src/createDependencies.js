import { createSupabaseGateway } from './config/supabase.js'
import { createAuthenticate } from './middleware/authenticate.js'
import { createAssignmentController } from './modules/assignments/assignmentController.js'
import { createAssignmentRouter } from './modules/assignments/assignmentRoutes.js'
import { createAssignmentService } from './modules/assignments/assignmentService.js'
import { createReferenceController } from './modules/assignments/referenceController.js'
import { createReferenceRouter } from './modules/assignments/referenceRoutes.js'
import { createReferenceService } from './modules/assignments/referenceService.js'
import { createAuthController } from './modules/auth/authController.js'
import { createAuthRouter } from './modules/auth/authRoutes.js'
import { createAuthService } from './modules/auth/authService.js'
import { createRequiredImageUpload } from './modules/storage/imageUpload.js'
import { createStorageService } from './modules/storage/storageService.js'

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
  const storageService = createStorageService({ adminClient: gateway.adminClient })
  const referenceService = createReferenceService({ assignmentService, storageService })
  const referenceController = createReferenceController({ referenceService })
  const referenceRouter = createReferenceRouter({
    controller: referenceController,
    authenticate,
    imageUpload: createRequiredImageUpload(),
  })
  const authController = createAuthController({
    authService,
    nodeEnv: config.NODE_ENV,
  })
  const authRouter = createAuthRouter({
    controller: authController,
    authenticate,
  })

  return { assignmentRouter, authRouter, authenticate, gateway, referenceRouter }
}
