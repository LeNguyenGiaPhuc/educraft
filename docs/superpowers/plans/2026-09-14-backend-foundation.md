# EduCraft Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng nền tảng Express có cấu hình Supabase, quy ước lỗi, validation, xác thực bằng Supabase Auth và phân quyền theo role để hai module nghiệp vụ có thể phát triển song song.

**Architecture:** React chỉ gọi REST API của Express. Express lưu Supabase access/refresh token trong cookie HttpOnly, xác thực access token bằng Supabase Auth, tạo user-scoped client cho truy vấn RLS và chỉ giữ admin client trong backend. App được tạo bằng factory và các dependency được inject để test không cần kết nối Supabase thật.

**Tech Stack:** Node.js 20.19+, JavaScript ESM, Express 5, Supabase JS v2, Zod, cookie-parser, CORS, node:test, Supertest, ESLint 9.

**Spec:** `docs/superpowers/specs/2026-09-14-backend-architecture-design.md`

## Global Constraints

- Dùng Node.js từ 20.19 trở lên và JavaScript ESM; không chuyển sang TypeScript.
- Frontend không gọi trực tiếp Supabase.
- Truy vấn dữ liệu thông thường phải dùng user-scoped Supabase client để RLS có hiệu lực.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ tồn tại trong backend và không được log hoặc trả về response.
- Cookie xác thực phải là `HttpOnly`, `SameSite=Lax`, và chỉ bật `Secure` trong production.
- API thành công dùng `{ "data": ... }`; API lỗi dùng `{ "error": { "code", "message", "fields" } }`.
- Controller không chứa truy vấn database; service không phụ thuộc vào Express request/response.
- Code giữ ngắn, tên rõ nghĩa và không thêm abstraction ngoài nhu cầu của foundation.
- Thực hiện trong worktree riêng từ commit chứa spec; không chạm vào các thay đổi FE đang staged ở checkout chính.

## Scope của plan này

Plan này chỉ tạo `backend-foundation` và Auth. Các phần độc lập sau đây được
tách thành plan riêng sau khi foundation được merge:

1. `backend-admin-accounts-classes-import` cho Member 1.
2. `backend-assignments-submissions-storage-reviews` cho Member 2.
3. `frontend-api-integration` sau khi hai nhóm API đã đạt smoke test.

## File map

```text
backend/
  .env.example                         Biến môi trường mẫu, không chứa secret
  eslint.config.js                     ESLint cho Node ESM
  package.json                         Scripts và dependencies backend
  package-lock.json                    Dependency lock do npm tạo
  src/
    app.js                             Express app factory, middleware chung
    server.js                          Composition root và HTTP listener
    config/
      env.js                           Parse và validate process.env
      supabase.js                      Auth, user-scoped và admin clients
    common/
      errors.js                        AppError
      response.js                      Response thành công
      requestId.js                     Request ID middleware
    middleware/
      errorHandler.js                  404 và error response
      originGuard.js                   Chặn request ghi dữ liệu từ origin lạ
      validate.js                      Zod request validation
      authenticate.js                  Supabase user/profile authentication
      authorize.js                     Role authorization
    modules/
      auth/
        authCookies.js                 Tên cookie, set và clear cookie
        authValidators.js              Login schema
        authService.js                 Login, refresh, logout, active profile
        authController.js              HTTP handlers
        authRoutes.js                  /api/auth routes
    createDependencies.js              Ghép gateway, service, controller, router
  tests/
    health.test.js
    env.test.js
    supabase.test.js
    errors.test.js
    validate.test.js
    authenticate.test.js
    authService.test.js
    auth.test.js
docs/api-contract.md                   Contract Auth thật
README.md                              Cách cài và chạy backend
```

---

### Task 1: Bootstrap Express, test runner và lint

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Create: `backend/eslint.config.js`
- Create: `backend/src/app.js`
- Create: `backend/src/server.js`
- Create: `backend/tests/health.test.js`

**Interfaces:**
- Consumes: Không có interface từ task trước.
- Produces: `createApp(options) -> Express.Application`; `GET /api/health`; scripts `dev`, `start`, `test`, `test:watch`, `lint`.

- [ ] **Step 1: Tạo worktree và branch sạch**

Chạy từ repository chính:

```powershell
git worktree add "..\educraft-backend-foundation" -b feature/backend-foundation HEAD
Set-Location "..\educraft-backend-foundation\backend"
git status --short --branch
```

Expected: branch là `feature/backend-foundation` và working tree không có file thay đổi.

- [ ] **Step 2: Cài dependencies của foundation**

```powershell
npm install @supabase/supabase-js@2 cookie-parser multer zod
npm install --save-dev eslint@9 @eslint/js globals supertest
npm pkg set name=educraft-backend description="Express API for EduCraft" type=module main=src/server.js
npm pkg set private=true --json
npm pkg set engines.node=">=20.19.0"
npm pkg set scripts.dev="nodemon src/server.js" scripts.start="node src/server.js" scripts.test="node --test" scripts.lint="eslint ."
npm pkg set "scripts.test:watch=node --test --watch"
```

Kiểm tra `backend/package.json` vẫn giữ đầy đủ các `dependencies` và
`devDependencies` do npm vừa ghi vào file.

- [ ] **Step 3: Viết health test đang thất bại**

Tạo `backend/tests/health.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'

test('GET /api/health returns an ok response', async () => {
  const response = await request(createApp()).get('/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { data: { status: 'ok' } })
})
```

- [ ] **Step 4: Chạy test để xác nhận RED**

```powershell
npm test -- --test-name-pattern="GET /api/health"
```

Expected: FAIL vì `backend/src/app.js` chưa tồn tại.

- [ ] **Step 5: Tạo Express app tối thiểu**

Tạo `backend/src/app.js`:

```js
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
```

Tạo `backend/src/server.js`:

```js
import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)
const app = createApp({ frontendOrigin: process.env.FRONTEND_ORIGIN })

app.listen(port, () => {
  console.log(`EduCraft API listening on port ${port}`)
})
```

- [ ] **Step 6: Tạo ESLint config**

Tạo `backend/eslint.config.js`:

```js
import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
```

- [ ] **Step 7: Chạy test và lint để xác nhận GREEN**

```powershell
npm test
npm run lint
```

Expected: health test PASS và ESLint có 0 error.

- [ ] **Step 8: Commit bootstrap**

```powershell
git add backend/package.json backend/package-lock.json backend/eslint.config.js backend/src/app.js backend/src/server.js backend/tests/health.test.js
git commit -m "feat(backend): bootstrap Express API foundation"
```

---

### Task 2: Validate environment và tạo Supabase gateway

**Files:**
- Create: `backend/.env.example`
- Create: `backend/src/config/env.js`
- Create: `backend/src/config/supabase.js`
- Modify: `backend/src/server.js`
- Create: `backend/tests/env.test.js`
- Create: `backend/tests/supabase.test.js`

**Interfaces:**
- Consumes: `createApp({ frontendOrigin })` từ Task 1.
- Produces: `loadEnv(source) -> Config`; `createSupabaseGateway(config, createClientImpl?) -> { authClient, adminClient, createUserClient }`.

- [ ] **Step 1: Viết env tests đang thất bại**

Tạo `backend/tests/env.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { loadEnv } from '../src/config/env.js'

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3100',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
}

test('loadEnv returns normalized config', () => {
  const config = loadEnv(validEnv)

  assert.equal(config.PORT, 3100)
  assert.equal(config.NODE_ENV, 'test')
})

test('loadEnv rejects a missing Supabase URL', () => {
  const missingUrl = { ...validEnv }
  delete missingUrl.SUPABASE_URL

  assert.throws(() => loadEnv(missingUrl), /SUPABASE_URL/)
})
```

- [ ] **Step 2: Chạy env test để xác nhận RED**

```powershell
node --test tests/env.test.js
```

Expected: FAIL vì `src/config/env.js` chưa tồn tại.

- [ ] **Step 3: Implement env validation**

Tạo `backend/src/config/env.js`:

```js
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid environment variables: ${names}`)
  }

  return result.data
}
```

Tạo `backend/.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
```

- [ ] **Step 4: Chạy env test để xác nhận GREEN**

```powershell
node --test tests/env.test.js
```

Expected: 2 tests PASS.

- [ ] **Step 5: Viết Supabase gateway test đang thất bại**

Tạo `backend/tests/supabase.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { createSupabaseGateway } from '../src/config/supabase.js'

const config = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
}

test('gateway uses the user token only for the user-scoped client', () => {
  const calls = []
  const fakeCreateClient = (url, key, options) => {
    calls.push({ url, key, options })
    return { url, key, options }
  }
  const gateway = createSupabaseGateway(config, fakeCreateClient)

  gateway.createUserClient('user-token')

  assert.equal(calls[0].key, 'anon-key')
  assert.equal(calls[1].key, 'service-key')
  assert.equal(calls[2].key, 'anon-key')
  assert.equal(calls[2].options.global.headers.Authorization, 'Bearer user-token')
})

test('gateway rejects an empty user token', () => {
  const gateway = createSupabaseGateway(config, () => ({}))

  assert.throws(() => gateway.createUserClient(''), /access token/i)
})
```

- [ ] **Step 6: Chạy Supabase test để xác nhận RED**

```powershell
node --test tests/supabase.test.js
```

Expected: FAIL vì `src/config/supabase.js` chưa tồn tại.

- [ ] **Step 7: Implement Supabase gateway**

Tạo `backend/src/config/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
}

export function createSupabaseGateway(config, createClientImpl = createClient) {
  const authClient = createClientImpl(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    serverAuthOptions,
  )
  const adminClient = createClientImpl(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    serverAuthOptions,
  )

  function createUserClient(accessToken) {
    if (!accessToken) {
      throw new Error('A Supabase access token is required')
    }

    return createClientImpl(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      ...serverAuthOptions,
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    })
  }

  return { authClient, adminClient, createUserClient }
}
```

Sửa `backend/src/server.js`:

```js
import 'dotenv/config'

import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createSupabaseGateway } from './config/supabase.js'

const config = loadEnv()
const supabaseGateway = createSupabaseGateway(config)
const app = createApp({ frontendOrigin: config.FRONTEND_ORIGIN })

app.locals.supabase = supabaseGateway
app.listen(config.PORT, () => {
  console.log(`EduCraft API listening on port ${config.PORT}`)
})
```

- [ ] **Step 8: Chạy toàn bộ test và lint**

```powershell
npm test
npm run lint
```

Expected: 5 tests PASS và ESLint có 0 error.

- [ ] **Step 9: Commit environment và gateway**

```powershell
git add backend/.env.example backend/src/config backend/src/server.js backend/tests/env.test.js backend/tests/supabase.test.js
git commit -m "feat(backend): add validated Supabase configuration"
```

---

### Task 3: Chuẩn hóa response, request ID và lỗi API

**Files:**
- Create: `backend/src/common/errors.js`
- Create: `backend/src/common/response.js`
- Create: `backend/src/common/requestId.js`
- Create: `backend/src/middleware/errorHandler.js`
- Create: `backend/src/middleware/originGuard.js`
- Modify: `backend/src/app.js`
- Create: `backend/tests/errors.test.js`

**Interfaces:**
- Consumes: `createApp({ frontendOrigin, registerRoutes })` từ Task 1.
- Produces: `AppError(status, code, message, fields?)`; `sendData(response, data, status?)`; `requestId`; `createOriginGuard(frontendOrigin)`; `notFound`; `createErrorHandler(logger?)`.

- [ ] **Step 1: Viết API error tests đang thất bại**

Tạo `backend/tests/errors.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'

test('unknown route returns the shared error shape and request ID', async () => {
  const response = await request(createApp()).get('/api/missing')

  assert.equal(response.status, 404)
  assert.equal(response.body.error.code, 'NOT_FOUND')
  assert.ok(response.headers['x-request-id'])
})

test('AppError preserves status, code and fields', async () => {
  const app = createApp({
    registerRoutes(expressApp) {
      expressApp.get('/api/conflict', () => {
        throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng.', {
          email: 'Email đã được sử dụng.',
        })
      })
    },
  })
  const response = await request(app).get('/api/conflict')

  assert.equal(response.status, 409)
  assert.deepEqual(response.body.error.fields, {
    email: 'Email đã được sử dụng.',
  })
})

test('write request rejects an untrusted origin', async () => {
  const app = createApp({
    frontendOrigin: 'http://localhost:5173',
    registerRoutes(expressApp) {
      expressApp.post('/api/write', (_request, response) => {
        response.json({ data: { saved: true } })
      })
    },
  })
  const response = await request(app)
    .post('/api/write')
    .set('Origin', 'https://untrusted.example')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'INVALID_ORIGIN')
})
```

- [ ] **Step 2: Chạy test để xác nhận RED**

```powershell
node --test tests/errors.test.js
```

Expected: FAIL vì các common/error modules chưa tồn tại.

- [ ] **Step 3: Implement common error và response helpers**

Tạo `backend/src/common/errors.js`:

```js
export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}
```

Tạo `backend/src/common/response.js`:

```js
export function sendData(response, data, status = 200) {
  return response.status(status).json({ data })
}
```

Tạo `backend/src/common/requestId.js`:

```js
import { randomUUID } from 'node:crypto'

export function requestId(request, response, next) {
  const incomingId = request.get('x-request-id')
  request.id = incomingId || randomUUID()
  response.set('x-request-id', request.id)
  next()
}
```

Tạo `backend/src/middleware/originGuard.js`:

```js
import { AppError } from '../common/errors.js'

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function createOriginGuard(frontendOrigin) {
  return function originGuard(request, _response, next) {
    if (safeMethods.has(request.method)) {
      return next()
    }

    if (request.get('origin') !== frontendOrigin) {
      return next(new AppError(
        403,
        'INVALID_ORIGIN',
        'Nguồn gửi request không được phép.',
      ))
    }

    return next()
  }
}
```

- [ ] **Step 4: Implement 404 và error handler**

Tạo `backend/src/middleware/errorHandler.js`:

```js
import { AppError } from '../common/errors.js'

export function notFound(_request, _response, next) {
  next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.'))
}

export function createErrorHandler(logger = console) {
  return function errorHandler(error, request, response, next) {
    if (response.headersSent) {
      return next(error)
    }

    const knownError = error instanceof AppError
    const status = knownError ? error.status : 500
    const body = {
      code: knownError ? error.code : 'INTERNAL_ERROR',
      message: knownError ? error.message : 'Hệ thống đang gặp lỗi.',
    }

    if (knownError && error.fields) {
      body.fields = error.fields
    }

    if (!knownError) {
      logger.error({
        requestId: request.id,
        method: request.method,
        path: request.originalUrl,
        message: error.message,
      })
    }

    return response.status(status).json({ error: body })
  }
}
```

- [ ] **Step 5: Wire middleware vào app factory**

Sửa `backend/src/app.js` để nhận `logger`, dùng `sendData`, và đặt middleware theo đúng thứ tự:

```js
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
```

- [ ] **Step 6: Chạy test và lint để xác nhận GREEN**

```powershell
npm test
npm run lint
```

Expected: toàn bộ tests PASS, bao gồm 2 error tests, và ESLint có 0 error.

- [ ] **Step 7: Commit error foundation**

```powershell
git add backend/src/app.js backend/src/common backend/src/middleware/errorHandler.js backend/src/middleware/originGuard.js backend/tests/errors.test.js
git commit -m "feat(backend): standardize API responses and errors"
```

---

### Task 4: Thêm Zod request validation middleware

**Files:**
- Create: `backend/src/middleware/validate.js`
- Create: `backend/tests/validate.test.js`

**Interfaces:**
- Consumes: `AppError` từ Task 3.
- Produces: `validate({ body?, params?, query? })`; dữ liệu đã parse tại `request.validated`.

- [ ] **Step 1: Viết validation tests đang thất bại**

Tạo `backend/tests/validate.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'
import { z } from 'zod'

import { createApp } from '../src/app.js'
import { validate } from '../src/middleware/validate.js'

const schema = {
  body: z.object({ email: z.string().trim().toLowerCase().email() }),
}

test('validate exposes normalized data', async () => {
  const app = createApp({
    registerRoutes(expressApp) {
      expressApp.post('/api/example', validate(schema), (requestValue, response) => {
        response.json({ data: requestValue.validated.body })
      })
    },
  })
  const response = await request(app)
    .post('/api/example')
    .set('Origin', 'http://localhost:5173')
    .send({ email: '  STUDENT@EXAMPLE.COM ' })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.email, 'student@example.com')
})

test('validate returns field errors without running the handler', async () => {
  const app = createApp({
    registerRoutes(expressApp) {
      expressApp.post('/api/example', validate(schema), (requestValue, response) => {
        response.json({ data: requestValue.validated.body })
      })
    },
  })
  const response = await request(app)
    .post('/api/example')
    .set('Origin', 'http://localhost:5173')
    .send({ email: 'wrong' })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
  assert.ok(response.body.error.fields.email)
})
```

- [ ] **Step 2: Chạy test để xác nhận RED**

```powershell
node --test tests/validate.test.js
```

Expected: FAIL vì `src/middleware/validate.js` chưa tồn tại.

- [ ] **Step 3: Implement validation middleware**

Tạo `backend/src/middleware/validate.js`:

```js
import { AppError } from '../common/errors.js'

function toFieldErrors(issues) {
  const fields = {}

  for (const issue of issues) {
    const name = issue.path.join('.') || 'request'
    fields[name] ??= issue.message
  }

  return fields
}

export function validate(schemas) {
  return function validateRequest(request, _response, next) {
    const validated = {}

    for (const target of ['body', 'params', 'query']) {
      const schema = schemas[target]
      if (!schema) continue

      const result = schema.safeParse(request[target])
      if (!result.success) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          'Kiểm tra lại dữ liệu đã nhập.',
          toFieldErrors(result.error.issues),
        ))
      }

      validated[target] = result.data
    }

    request.validated = validated
    return next()
  }
}
```

- [ ] **Step 4: Chạy test và lint để xác nhận GREEN**

```powershell
npm test
npm run lint
```

Expected: toàn bộ tests PASS và ESLint có 0 error.

- [ ] **Step 5: Commit validation middleware**

```powershell
git add backend/src/middleware/validate.js backend/tests/validate.test.js
git commit -m "feat(backend): add shared request validation"
```

---

### Task 5: Xác thực active profile và phân quyền role

**Files:**
- Create: `backend/src/modules/auth/authCookies.js`
- Create: `backend/src/middleware/authenticate.js`
- Create: `backend/src/middleware/authorize.js`
- Create: `backend/tests/authenticate.test.js`

**Interfaces:**
- Consumes: `AppError`; gateway `{ authClient, createUserClient }` từ Task 2.
- Produces: `ACCESS_COOKIE`; `createAuthenticate({ authClient, createUserClient })`; `requireRole(...roles)`; `request.auth = { user, profile, accessToken, supabase }`.

- [ ] **Step 1: Viết authentication tests đang thất bại**

Tạo `backend/tests/authenticate.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { createAuthenticate } from '../src/middleware/authenticate.js'
import { requireRole } from '../src/middleware/authorize.js'

function fakeUserClient(profile) {
  return {
    from() {
      return {
        select() { return this },
        eq() { return this },
        async single() { return { data: profile, error: null } },
      }
    },
  }
}

function buildProtectedApp(profile) {
  const authClient = {
    auth: {
      async getUser(token) {
        return token === 'valid-token'
          ? { data: { user: { id: 'user-1' } }, error: null }
          : { data: { user: null }, error: new Error('invalid') }
      },
    },
  }
  const authenticate = createAuthenticate({
    authClient,
    createUserClient: () => fakeUserClient(profile),
  })

  return createApp({
    registerRoutes(expressApp) {
      expressApp.get(
        '/api/teacher-only',
        authenticate,
        requireRole('TEACHER'),
        (requestValue, response) => {
          response.json({ data: requestValue.auth.profile })
        },
      )
    },
  })
}

test('protected route rejects a missing access cookie', async () => {
  const response = await request(buildProtectedApp()).get('/api/teacher-only')

  assert.equal(response.status, 401)
  assert.equal(response.body.error.code, 'AUTH_REQUIRED')
})

test('authentication rejects a locked profile', async () => {
  const response = await request(buildProtectedApp({
    id: 'user-1', role: 'TEACHER', status: 'LOCKED',
  }))
    .get('/api/teacher-only')
    .set('Cookie', 'educraft_access_token=valid-token')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'ACCOUNT_NOT_ACTIVE')
})

test('role middleware rejects a different active role', async () => {
  const response = await request(buildProtectedApp({
    id: 'user-1', role: 'STUDENT', status: 'ACTIVE',
  }))
    .get('/api/teacher-only')
    .set('Cookie', 'educraft_access_token=valid-token')

  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'FORBIDDEN')
})

test('teacher reaches a teacher route with user-scoped context', async () => {
  const response = await request(buildProtectedApp({
    id: 'user-1', role: 'TEACHER', status: 'ACTIVE',
  }))
    .get('/api/teacher-only')
    .set('Cookie', 'educraft_access_token=valid-token')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.role, 'TEACHER')
})
```

- [ ] **Step 2: Chạy test để xác nhận RED**

```powershell
node --test tests/authenticate.test.js
```

Expected: FAIL vì auth middleware chưa tồn tại.

- [ ] **Step 3: Tạo cookie name và authentication middleware**

Tạo `backend/src/modules/auth/authCookies.js`:

```js
export const ACCESS_COOKIE = 'educraft_access_token'
export const REFRESH_COOKIE = 'educraft_refresh_token'
```

Tạo `backend/src/middleware/authenticate.js`:

```js
import { AppError } from '../common/errors.js'
import { ACCESS_COOKIE } from '../modules/auth/authCookies.js'

export function createAuthenticate({ authClient, createUserClient }) {
  return async function authenticate(request, _response, next) {
    try {
      const accessToken = request.cookies[ACCESS_COOKIE]
      if (!accessToken) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.')
      }

      const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
      if (userError || !userData.user) {
        throw new AppError(401, 'INVALID_SESSION', 'Phiên đăng nhập không hợp lệ.')
      }

      const supabase = createUserClient(accessToken)
      const profileResult = await supabase
        .from('profiles')
        .select('id,email,username,full_name,role,status,student_code')
        .eq('id', userData.user.id)
        .single()

      if (profileResult.error?.code === 'PGRST116') {
        throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
      }
      if (profileResult.error) {
        throw profileResult.error
      }
      if (!profileResult.data) {
        throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
      }
      if (profileResult.data.status !== 'ACTIVE') {
        throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản chưa hoạt động.')
      }

      request.auth = {
        user: userData.user,
        profile: profileResult.data,
        accessToken,
        supabase,
      }
      return next()
    } catch (error) {
      return next(error)
    }
  }
}
```

- [ ] **Step 4: Tạo role middleware**

Tạo `backend/src/middleware/authorize.js`:

```js
import { AppError } from '../common/errors.js'

export function requireRole(...allowedRoles) {
  return function authorizeRole(request, _response, next) {
    if (!request.auth || !allowedRoles.includes(request.auth.profile.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'))
    }

    return next()
  }
}
```

- [ ] **Step 5: Chạy test và lint để xác nhận GREEN**

```powershell
npm test
npm run lint
```

Expected: toàn bộ tests PASS, gồm 4 authorization cases, và ESLint có 0 error.

- [ ] **Step 6: Commit authentication middleware**

```powershell
git add backend/src/middleware/authenticate.js backend/src/middleware/authorize.js backend/src/modules/auth/authCookies.js backend/tests/authenticate.test.js
git commit -m "feat(backend): enforce active user roles"
```

---

### Task 6: Implement Auth endpoints và composition root

**Files:**
- Modify: `backend/src/modules/auth/authCookies.js`
- Create: `backend/src/modules/auth/authValidators.js`
- Create: `backend/src/modules/auth/authService.js`
- Create: `backend/src/modules/auth/authController.js`
- Create: `backend/src/modules/auth/authRoutes.js`
- Create: `backend/src/createDependencies.js`
- Modify: `backend/src/server.js`
- Create: `backend/tests/authService.test.js`
- Create: `backend/tests/auth.test.js`

**Interfaces:**
- Consumes: gateway từ Task 2; `sendData`, `AppError`, `validate`, `createAuthenticate` từ Tasks 3-5.
- Produces: `POST /api/auth/login`; `POST /api/auth/refresh`; `POST /api/auth/logout`; `GET /api/auth/me`; `createDependencies(config)`.

- [ ] **Step 1: Viết Auth service tests đang thất bại**

Tạo `backend/tests/authService.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { createAuthService } from '../src/modules/auth/authService.js'

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
}

function buildService(profileResult) {
  const selectedIds = []
  const revoked = []
  const authClient = {
    auth: {
      async signInWithPassword() {
        return {
          data: { user: { id: 'user-1' }, session },
          error: null,
        }
      },
      async refreshSession() {
        return { data: {}, error: new Error('invalid refresh token') }
      },
    },
  }
  const adminClient = {
    auth: {
      admin: {
        async signOut(...args) {
          revoked.push(args)
          return { error: null }
        },
      },
    },
  }
  const createUserClient = () => ({
    from() {
      return {
        select() { return this },
        eq(_column, value) {
          selectedIds.push(value)
          return this
        },
        async single() { return profileResult },
      }
    },
  })

  return {
    service: createAuthService({ authClient, adminClient, createUserClient }),
    selectedIds,
    revoked,
  }
}

test('login loads the active profile belonging to the Auth user', async () => {
  const profile = { id: 'user-1', role: 'TEACHER', status: 'ACTIVE' }
  const context = buildService({ data: profile, error: null })

  const result = await context.service.login({
    email: 'teacher@educraft.test',
    password: 'teacher123',
  })

  assert.equal(result.profile, profile)
  assert.deepEqual(context.selectedIds, ['user-1'])
})

test('login revokes the new session when the profile is locked', async () => {
  const context = buildService({
    data: { id: 'user-1', role: 'TEACHER', status: 'LOCKED' },
    error: null,
  })

  await assert.rejects(
    context.service.login({ email: 'teacher@educraft.test', password: 'teacher123' }),
    (error) => error.code === 'ACCOUNT_NOT_ACTIVE',
  )
  assert.deepEqual(context.revoked, [['access-token', 'local']])
})

test('refresh returns INVALID_SESSION for an invalid refresh token', async () => {
  const context = buildService({ data: null, error: null })

  await assert.rejects(
    context.service.refresh('bad-refresh-token'),
    (error) => error.code === 'INVALID_SESSION',
  )
})
```

- [ ] **Step 2: Chạy Auth service tests để xác nhận RED**

```powershell
node --test tests/authService.test.js
```

Expected: FAIL vì `src/modules/auth/authService.js` chưa tồn tại.

- [ ] **Step 3: Viết Auth route tests đang thất bại**

Tạo `backend/tests/auth.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { createAuthController } from '../src/modules/auth/authController.js'
import { createAuthRouter } from '../src/modules/auth/authRoutes.js'

const profile = {
  id: 'user-1',
  email: 'teacher@educraft.test',
  full_name: 'Trần Gia Phúc',
  role: 'TEACHER',
  status: 'ACTIVE',
}

function buildAuthApp() {
  const authService = {
    async login() {
      return {
        profile,
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
      }
    },
    async refresh() {
      return {
        profile,
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      }
    },
    async logout() {},
  }
  const authenticate = (requestValue, response, next) => {
    requestValue.auth = { profile }
    next()
  }
  const controller = createAuthController({ authService, nodeEnv: 'test' })
  const router = createAuthRouter({ controller, authenticate })

  return createApp({
    registerRoutes(expressApp) {
      expressApp.use('/api/auth', router)
    },
  })
}

test('login sets HttpOnly cookies and returns profile only', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ email: 'TEACHER@EDUCRAFT.TEST', password: 'teacher123' })

  assert.equal(response.status, 200)
  assert.equal(response.body.data.role, 'TEACHER')
  assert.equal(response.body.data.access_token, undefined)
  assert.match(response.headers['set-cookie'][0], /HttpOnly/)
  assert.equal(response.headers['cache-control'], 'private, no-store')
})

test('login rejects an invalid request body', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:5173')
    .send({ email: 'wrong' })

  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, 'VALIDATION_ERROR')
})

test('refresh rotates both cookies', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/refresh')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', 'educraft_refresh_token=old-refresh-token')

  assert.equal(response.status, 200)
  assert.equal(response.headers['set-cookie'].length, 2)
})

test('me returns the authenticated profile', async () => {
  const response = await request(buildAuthApp()).get('/api/auth/me')

  assert.equal(response.status, 200)
  assert.equal(response.body.data.id, 'user-1')
})

test('logout clears authentication cookies', async () => {
  const response = await request(buildAuthApp())
    .post('/api/auth/logout')
    .set('Origin', 'http://localhost:5173')
    .set('Cookie', 'educraft_access_token=access-token')

  assert.equal(response.status, 204)
  assert.match(response.headers['set-cookie'].join(';'), /Expires=Thu, 01 Jan 1970/)
})
```

- [ ] **Step 4: Chạy Auth route tests để xác nhận RED**

```powershell
node --test tests/auth.test.js
```

Expected: FAIL vì Auth service/controller/routes chưa tồn tại.

- [ ] **Step 5: Hoàn thiện cookie helpers**

Thay nội dung `backend/src/modules/auth/authCookies.js` bằng:

```js
export const ACCESS_COOKIE = 'educraft_access_token'
export const REFRESH_COOKIE = 'educraft_refresh_token'

function cookieOptions(nodeEnv) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
  }
}

export function setAuthCookies(response, session, nodeEnv) {
  const options = cookieOptions(nodeEnv)
  response.cookie(ACCESS_COOKIE, session.access_token, {
    ...options,
    maxAge: session.expires_in * 1000,
  })
  response.cookie(REFRESH_COOKIE, session.refresh_token, {
    ...options,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookies(response, nodeEnv) {
  const options = cookieOptions(nodeEnv)
  response.clearCookie(ACCESS_COOKIE, options)
  response.clearCookie(REFRESH_COOKIE, options)
}
```

- [ ] **Step 6: Tạo Auth validator**

Tạo `backend/src/modules/auth/authValidators.js`:

```js
import { z } from 'zod'

export const loginSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Email không hợp lệ.'),
    password: z.string().min(1, 'Nhập mật khẩu.'),
  }),
}
```

- [ ] **Step 7: Implement Auth service**

Tạo `backend/src/modules/auth/authService.js`:

```js
import { AppError } from '../../common/errors.js'

export function createAuthService({ authClient, adminClient, createUserClient }) {
  async function readActiveProfile(accessToken, userId) {
    const supabase = createUserClient(accessToken)
    const result = await supabase
      .from('profiles')
      .select('id,email,username,full_name,role,status,student_code')
      .eq('id', userId)
      .single()

    if (result.error?.code === 'PGRST116') {
      throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
    }
    if (result.error) throw result.error
    if (!result.data) {
      throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
    }
    if (result.data.status !== 'ACTIVE') {
      throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản chưa hoạt động.')
    }

    return result.data
  }

  async function revoke(accessToken) {
    if (accessToken) {
      await adminClient.auth.admin.signOut(accessToken, 'local')
    }
  }

  async function acceptSession(result, failureCode, failureMessage) {
    if (result.error || !result.data.session || !result.data.user) {
      throw new AppError(401, failureCode, failureMessage)
    }

    try {
      const profile = await readActiveProfile(
        result.data.session.access_token,
        result.data.user.id,
      )
      return { session: result.data.session, profile }
    } catch (error) {
      await revoke(result.data.session.access_token)
      throw error
    }
  }

  return {
    async login(credentials) {
      const result = await authClient.auth.signInWithPassword(credentials)
      return acceptSession(
        result,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng.',
      )
    },

    async refresh(refreshToken) {
      if (!refreshToken) {
        throw new AppError(401, 'REFRESH_REQUIRED', 'Phiên đăng nhập đã hết hạn.')
      }
      const result = await authClient.auth.refreshSession({
        refresh_token: refreshToken,
      })
      return acceptSession(
        result,
        'INVALID_SESSION',
        'Phiên đăng nhập không hợp lệ.',
      )
    },

    async logout(accessToken) {
      await revoke(accessToken)
    },
  }
}
```

- [ ] **Step 8: Implement Auth controller**

Tạo `backend/src/modules/auth/authController.js`:

```js
import { sendData } from '../../common/response.js'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './authCookies.js'

export function createAuthController({ authService, nodeEnv }) {
  function noStore(response) {
    response.set('Cache-Control', 'private, no-store')
  }

  return {
    async login(request, response) {
      noStore(response)
      const result = await authService.login(request.validated.body)
      setAuthCookies(response, result.session, nodeEnv)
      return sendData(response, result.profile)
    },

    async refresh(request, response) {
      noStore(response)
      const result = await authService.refresh(request.cookies[REFRESH_COOKIE])
      setAuthCookies(response, result.session, nodeEnv)
      return sendData(response, result.profile)
    },

    async logout(request, response) {
      noStore(response)
      await authService.logout(request.cookies[ACCESS_COOKIE])
      clearAuthCookies(response, nodeEnv)
      return response.status(204).end()
    },

    me(request, response) {
      noStore(response)
      return sendData(response, request.auth.profile)
    },
  }
}
```

- [ ] **Step 9: Implement Auth routes**

Tạo `backend/src/modules/auth/authRoutes.js`:

```js
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
```

- [ ] **Step 10: Tạo composition root**

Tạo `backend/src/createDependencies.js`:

```js
import { createSupabaseGateway } from './config/supabase.js'
import { createAuthenticate } from './middleware/authenticate.js'
import { createAuthController } from './modules/auth/authController.js'
import { createAuthRouter } from './modules/auth/authRoutes.js'
import { createAuthService } from './modules/auth/authService.js'

export function createDependencies(config) {
  const gateway = createSupabaseGateway(config)
  const authService = createAuthService(gateway)
  const authenticate = createAuthenticate(gateway)
  const authController = createAuthController({
    authService,
    nodeEnv: config.NODE_ENV,
  })
  const authRouter = createAuthRouter({
    controller: authController,
    authenticate,
  })

  return { authRouter, authenticate, gateway }
}
```

Thay phần tạo app trong `backend/src/server.js` bằng:

```js
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
  },
})

app.listen(config.PORT, () => {
  console.log(`EduCraft API listening on port ${config.PORT}`)
})
```

- [ ] **Step 11: Chạy Auth tests và sửa đúng lỗi phát hiện**

```powershell
node --test tests/auth.test.js
npm test
npm run lint
```

Expected: 5 Auth route tests PASS, toàn bộ backend tests PASS và ESLint có 0 error.

- [ ] **Step 12: Commit Auth API**

```powershell
git add backend/src/modules/auth backend/src/createDependencies.js backend/src/server.js backend/tests/authService.test.js backend/tests/auth.test.js
git commit -m "feat(backend): add Supabase Auth session API"
```

---

### Task 7: Cập nhật contract, hướng dẫn và kiểm tra foundation

**Files:**
- Modify: `docs/api-contract.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: toàn bộ Auth endpoints và scripts từ Tasks 1-6.
- Produces: contract dùng cookie, hướng dẫn chạy backend, verification record trong commit history.

- [ ] **Step 1: Cập nhật Auth contract**

Trong `docs/api-contract.md`, thay phần Login cũ bằng nội dung xác định rõ:

```markdown
### Authentication

`POST /api/auth/login` nhận `email` và `password`. Response chỉ trả profile;
access token và refresh token được đặt trong HttpOnly cookies.

`POST /api/auth/refresh` dùng refresh cookie, xoay vòng cả hai cookies và trả
profile đang hoạt động.

`POST /api/auth/logout` thu hồi phiên hiện tại, xóa cookies và trả `204`.

`GET /api/auth/me` trả profile của phiên hiện tại. Tài khoản `PENDING` hoặc
`LOCKED` nhận `403 ACCOUNT_NOT_ACTIVE`.

Các request phải gửi cookies bằng `credentials: 'include'`. Frontend không
đọc hoặc lưu Supabase token trong localStorage.
```

Thêm bảng enum canonical:

```markdown
| Nhóm | Giá trị API |
| --- | --- |
| Role | `ADMIN`, `TEACHER`, `STUDENT` |
| Account status | `PENDING`, `ACTIVE`, `LOCKED` |
```

- [ ] **Step 2: Cập nhật hướng dẫn chạy backend**

Thêm vào `README.md`:

````markdown
## Chạy backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run dev
```

Điền Supabase URL, anon key và service role key vào `.env`. Không commit file
này. API mặc định chạy tại `http://localhost:3000`; kiểm tra bằng
`GET http://localhost:3000/api/health`.

```powershell
npm test
npm run lint
```
````

- [ ] **Step 3: Cài lại từ lockfile và chạy full verification**

```powershell
$backendRoot = (Resolve-Path -LiteralPath '.').Path
$dependencyPath = (Resolve-Path -LiteralPath '.\node_modules').Path
if (-not $dependencyPath.StartsWith($backendRoot + [IO.Path]::DirectorySeparatorChar)) {
  throw 'node_modules is outside the backend workspace'
}
Remove-Item -Recurse -Force -LiteralPath $dependencyPath
npm ci
npm test
npm run lint
git diff --check
```

Trước `Remove-Item`, xác nhận `$backendRoot` kết thúc bằng
`educraft-backend-foundation\backend`; không chạy lệnh này từ repository root.

Expected: `npm ci` exit 0, toàn bộ tests PASS, ESLint có 0 error và
`git diff --check` không in lỗi.

- [ ] **Step 4: Kiểm tra secret và phạm vi thay đổi**

Chạy từ repository root của worktree:

```powershell
git status --short
git diff --stat HEAD
git grep -n "SUPABASE_SERVICE_ROLE_KEY=" -- backend ':!backend/.env.example'
git ls-files backend/.env
```

Expected:

- Chỉ có file backend, `README.md` và `docs/api-contract.md` thuộc plan.
- `git grep` không tìm thấy service key được gán giá trị.
- `git ls-files backend/.env` không trả về file nào.

- [ ] **Step 5: Commit docs**

```powershell
git add README.md docs/api-contract.md
git commit -m "docs(backend): document Auth API and local setup"
```

- [ ] **Step 6: Kiểm tra branch trước khi mở PR**

```powershell
git status --short --branch
git log --oneline main..HEAD
npm test --prefix backend
npm run lint --prefix backend
```

Expected: worktree clean; branch chỉ có các commit foundation của Tasks 1-7;
test và lint đều exit 0.

## Foundation acceptance checklist

- `GET /api/health` trả `{ "data": { "status": "ok" } }`.
- Server từ chối khởi động khi thiếu biến Supabase bắt buộc.
- User-scoped client truyền bearer token; admin client không xuất khỏi backend.
- Lỗi API và validation theo đúng response convention.
- Request thay đổi dữ liệu từ origin khác `FRONTEND_ORIGIN` bị từ chối.
- Endpoint được bảo vệ từ chối request thiếu cookie, profile không active và sai role.
- Login/refresh đặt HttpOnly cookies và không trả token trong JSON.
- Logout xóa cookies và dùng scope `local`.
- Auth responses đặt `Cache-Control: private, no-store`.
- Test và lint chạy không cần Supabase thật.
- `.env` và secret không xuất hiện trong Git.
- `README.md` và `docs/api-contract.md` khớp với implementation.
