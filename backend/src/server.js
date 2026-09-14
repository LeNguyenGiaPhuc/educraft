import 'dotenv/config'

import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createDependencies } from './createDependencies.js'

const config = loadEnv()
const dependencies = createDependencies(config)
const app = createApp({
  frontendOrigin: config.FRONTEND_ORIGIN,
  registerRoutes(expressApp) {
    expressApp.use('/api/auth', dependencies.authRouter)
    expressApp.use('/api', dependencies.assignmentRouter)
    expressApp.use('/api', dependencies.referenceRouter)
    expressApp.use('/api', dependencies.submissionRouter)
  },
})

app.listen(config.PORT, () => {
  console.log(`EduCraft API listening on port ${config.PORT}`)
})
