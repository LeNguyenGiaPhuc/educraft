import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import { requestId } from './common/requestId.js'
import { sendData } from './common/response.js'
import { createErrorHandler, notFound } from './middleware/errorHandler.js'
import { createOriginGuard } from './middleware/originGuard.js'

export function createApp({
  frontendOrigin = 'http://localhost:5173',
  registerRoutes = () => {},
  logger = console,
} = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: frontendOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(requestId)
  app.use(createOriginGuard(frontendOrigin))

  app.get('/api/health', (_request, response) => {
    sendData(response, { status: 'ok' })
  })

  registerRoutes(app)
  app.use(notFound)
  app.use(createErrorHandler(logger))
  return app
}
