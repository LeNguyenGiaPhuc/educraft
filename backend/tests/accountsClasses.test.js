import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { AppError } from '../src/common/errors.js'
import { createAccountController } from '../src/modules/accounts/accountController.js'
import { createAccountRouter } from '../src/modules/accounts/accountRoutes.js'
import { createClassController } from '../src/modules/classes/classController.js'
import { createClassRouter } from '../src/modules/classes/classRoutes.js'

const frontendOrigin = 'http://localhost:5173'
const adminId = '11111111-1111-4111-8111-111111111111'
const classId = '22222222-2222-4222-8222-222222222222'

function authenticatedAs(role = 'ADMIN') {
  return function authenticate(requestValue, _response, next) {
    requestValue.auth = {
      profile: { id: adminId, role, status: 'ACTIVE' },
      supabase: { userScoped: true },
    }
    next()
  }
}

function unauthenticated(_request, _response, next) {
  next(new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'))
}

function buildAccountApp({ service = createAccountService(), authenticate = authenticatedAs() } = {}) {
  const controller = createAccountController({ accountService: service })
  const router = createAccountRouter({ controller, authenticate })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api/admin', router)
    },
    logger: { error() {} },
  })
}

function buildClassApp({ service = createClassService(), authenticate = authenticatedAs() } = {}) {
  const controller = createClassController({ classService: service })
  const router = createClassRouter({ controller, authenticate })

  return createApp({
    frontendOrigin,
    registerRoutes(expressApp) {
      expressApp.use('/api/admin', router)
    },
    logger: { error() {} },
  })
}

function createAccountService(overrides = {}) {
  return {
    async listAccounts() { return [] },
    async getAccount() { return { id: adminId, email: 'admin@educraft.test' } },
    async createAccount() { return { id: adminId, email: 'admin@educraft.test' } },
    async updateAccount() { return { id: adminId, email: 'admin@educraft.test' } },
    async lockAccount() { return { id: adminId, status: 'LOCKED' } },
    async unlockAccount() { return { id: adminId, status: 'ACTIVE' } },
    async deleteAccount() { return null },
    ...overrides,
  }
}

function createClassService(overrides = {}) {
  return {
    async listClasses() { return [] },
    async getClass() { return { id: classId, code: '10A1' } },
    async createClass() { return { id: classId, code: '10A1' } },
    async updateClass() { return { id: classId, code: '10A1' } },
    async deleteClass() { return null },
    async assignTeacher() { return { id: classId, teacher_id: '33333333-3333-4333-8333-333333333333' } },
    async addStudent() { return { class_id: classId, student_id: '66666666-6666-4666-8666-666666666666', student_number: '01' } },
    async removeStudent() { return { class_id: classId, student_id: '66666666-6666-4666-8666-666666666666' } },
    async importStudents() { return { created: 0, memberships: [] } },
    ...overrides,
  }
}

test('admin account routes produce a standard data envelope and require an ACTIVE ADMIN profile', async () => {
  const app = buildAccountApp()
  const listResponse = await request(app)
    .get('/api/admin/accounts')
    .set('Origin', frontendOrigin)

  assert.equal(listResponse.status, 200)
  assert.deepEqual(listResponse.body.data, [])

  const studentResponse = await request(buildAccountApp({ authenticate: authenticatedAs('STUDENT') }))
    .get('/api/admin/accounts')
    .set('Origin', frontendOrigin)

  assert.equal(studentResponse.status, 403)
  assert.equal(studentResponse.body.error.code, 'FORBIDDEN')
})

test('admin class routes expose the same controller-service shape and overload only the class endpoints', async () => {
  const app = buildClassApp()
  const response = await request(app)
    .post('/api/admin/classes')
    .set('Origin', frontendOrigin)
    .send({
      code: '10A1',
      subject: 'Toán',
      semester: '1',
      school_year: '2026-2027',
    })

  assert.equal(response.status, 201)
  assert.equal(response.body.data.code, '10A1')
})

test('admin import route validation rejects unauthenticated and wrong-role calls before controller use', async () => {
  const failAuthResponse = await request(buildClassApp({ authenticate: unauthenticated }))
    .post(`/api/admin/classes/${classId}/import-students`)
    .set('Origin', frontendOrigin)
    .send({ students: [] })

  const wrongRoleResponse = await request(buildClassApp({ authenticate: authenticatedAs('TEACHER') }))
    .post(`/api/admin/classes/${classId}/import-students`)
    .set('Origin', frontendOrigin)
    .send({ students: [] })

  assert.equal(failAuthResponse.status, 401)
  assert.equal(failAuthResponse.body.error.code, 'AUTH_REQUIRED')
  assert.equal(wrongRoleResponse.status, 403)
  assert.equal(wrongRoleResponse.body.error.code, 'FORBIDDEN')
})

test('admin account create returns a successful data envelope and validation rejects bad payloads', async () => {
  const app = buildAccountApp({
    service: createAccountService({
      createAccount() {
        return { id: adminId, email: 'admin@educraft.test', username: 'admin01', full_name: 'Admin Test' }
      },
    }),
  })

  const createdResponse = await request(app)
    .post('/api/admin/accounts')
    .set('Origin', frontendOrigin)
    .send({
      username: 'admin01',
      full_name: 'Admin Test',
      email: 'admin@educraft.test',
      role: 'ADMIN',
      status: 'PENDING',
    })

  assert.equal(createdResponse.status, 201)
  assert.equal(createdResponse.body.data.email, 'admin@educraft.test')

  const invalidResponse = await request(app)
    .post('/api/admin/accounts')
    .set('Origin', frontendOrigin)
    .send({
      username: '',
      full_name: 'Admin Test',
      email: 'not-an-email',
      role: 'ADMIN',
      status: 'PENDING',
    })

  assert.equal(invalidResponse.status, 400)
  assert.equal(invalidResponse.body.error.code, 'VALIDATION_ERROR')
})

test('admin duplicate account email and class code conflicts map to stable conflict errors', async () => {
  const accountApp = buildAccountApp({
    service: createAccountService({
      createAccount() {
        throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
      },
    }),
  })

  const emailConflict = await request(accountApp)
    .post('/api/admin/accounts')
    .set('Origin', frontendOrigin)
    .send({
      username: 'admin01',
      full_name: 'Admin Test',
      email: 'admin@educraft.test',
      role: 'ADMIN',
      status: 'PENDING',
    })

  assert.equal(emailConflict.status, 409)
  assert.equal(emailConflict.body.error.code, 'ACCOUNT_EMAIL_CONFLICT')

  const classApp = buildClassApp({
    service: createClassService({
      createClass() {
        throw new AppError(409, 'CLASS_CODE_CONFLICT', 'Mã lớp đã tồn tại.')
      },
    }),
  })

  const classConflict = await request(classApp)
    .post('/api/admin/classes')
    .set('Origin', frontendOrigin)
    .send({
      code: '10A1',
      subject: 'Toán',
      semester: '1',
      school_year: '2026-2027',
    })

  assert.equal(classConflict.status, 409)
  assert.equal(classConflict.body.error.code, 'CLASS_CODE_CONFLICT')
})

test('admin import route surfaces import rollback failures and account history deletes remain blocked', async () => {
  const importApp = buildClassApp({
    service: createClassService({
      importStudents() {
        throw new AppError(500, 'IMPORT_ROLLBACK_FAILED', 'Rollback import học sinh thất bại.')
      },
    }),
  })

  const rollbackResponse = await request(importApp)
    .post(`/api/admin/classes/${classId}/import-students`)
    .set('Origin', frontendOrigin)
    .send({
      students: [{ studentNumber: '01', name: 'Alice', email: 'alice@example.com' }],
    })

  assert.equal(rollbackResponse.status, 500)
  assert.equal(rollbackResponse.body.error.code, 'IMPORT_ROLLBACK_FAILED')

  const accountDeleteApp = buildAccountApp({
    service: createAccountService({
      deleteAccount() {
        throw new AppError(409, 'ACCOUNT_HAS_HISTORY', 'Tài khoản đã có lịch sử học tập nên không thể xóa.')
      },
    }),
  })

  const historyDeleteResponse = await request(accountDeleteApp)
    .delete(`/api/admin/accounts/${adminId}`)
    .set('Origin', frontendOrigin)

  assert.equal(historyDeleteResponse.status, 409)
  assert.equal(historyDeleteResponse.body.error.code, 'ACCOUNT_HAS_HISTORY')
})
