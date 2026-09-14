import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

export function createApp({
  frontendOrigin = 'http://localhost:5173',
  registerRoutes = () => {},
} = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: frontendOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/api/health', (_request, response) => {
    response.json({ data: { status: 'ok' } })
  })

  registerRoutes(app)
  return app
}
