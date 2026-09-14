import { createSupabaseGateway } from './config/supabase.js'
import { createAuthenticate } from './middleware/authenticate.js'
import { createAccountController } from './modules/accounts/accountController.js'
import { createAccountRouter } from './modules/accounts/accountRoutes.js'
import { createAccountService } from './modules/accounts/accountService.js'
import { createAiEvaluationController } from './modules/ai-evaluations/aiEvaluationController.js'
import { createAiEvaluationRouter } from './modules/ai-evaluations/aiEvaluationRoutes.js'
import { createAiEvaluationService } from './modules/ai-evaluations/aiEvaluationService.js'
import { createAssignmentController } from './modules/assignments/assignmentController.js'
import { createAssignmentRouter } from './modules/assignments/assignmentRoutes.js'
import { createAssignmentService } from './modules/assignments/assignmentService.js'
import { createClassController } from './modules/classes/classController.js'
import { createClassRouter } from './modules/classes/classRoutes.js'
import { createClassService } from './modules/classes/classService.js'
import { createReferenceController } from './modules/assignments/referenceController.js'
import { createReferenceRouter } from './modules/assignments/referenceRoutes.js'
import { createReferenceService } from './modules/assignments/referenceService.js'
import { createAuthController } from './modules/auth/authController.js'
import { createAuthRouter } from './modules/auth/authRoutes.js'
import { createAuthService } from './modules/auth/authService.js'
import { createRequiredImageUpload } from './modules/storage/imageUpload.js'
import { createStorageService } from './modules/storage/storageService.js'
import { createSubmissionController } from './modules/submissions/submissionController.js'
import { createSubmissionRouter } from './modules/submissions/submissionRoutes.js'
import { createSubmissionService } from './modules/submissions/submissionService.js'

export function createDependencies(config) {
  const gateway = createSupabaseGateway(config)
  const authService = createAuthService(gateway)
  const authenticate = createAuthenticate(gateway)

  const accountService = createAccountService({ adminClient: gateway.adminClient })
  const accountController = createAccountController({ accountService })
  const accountRouter = createAccountRouter({
    controller: accountController,
    authenticate,
  })

  const classService = createClassService({ adminClient: gateway.adminClient })
  const classController = createClassController({ classService })
  const classRouter = createClassRouter({
    controller: classController,
    authenticate,
  })

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
  const submissionService = createSubmissionService({
    adminClient: gateway.adminClient,
    assignmentService,
    storageService,
  })
  const submissionController = createSubmissionController({ submissionService })
  const submissionRouter = createSubmissionRouter({
    controller: submissionController,
    authenticate,
    imageUpload: createRequiredImageUpload(),
  })
  const aiEvaluationService = createAiEvaluationService({
    adminClient: gateway.adminClient,
    submissionService,
  })
  const aiEvaluationController = createAiEvaluationController({ aiEvaluationService })
  const aiEvaluationRouter = createAiEvaluationRouter({
    controller: aiEvaluationController,
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

  return {
    accountRouter,
    assignmentRouter,
    aiEvaluationRouter,
    authRouter,
    authenticate,
    classRouter,
    gateway,
    referenceRouter,
    submissionRouter,
  }
}
