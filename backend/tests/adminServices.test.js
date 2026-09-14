import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createAccountService } from '../src/modules/accounts/accountService.js'
import { createClassService } from '../src/modules/classes/classService.js'

const adminId = '11111111-1111-4111-8111-111111111111'
const classId = '22222222-2222-4222-8222-222222222222'
const teacherId = '33333333-3333-4333-8333-333333333333'
const studentId = '44444444-4444-4444-8444-444444444444'

function chain(result, calls = []) {
  const query = {}

  for (const method of ['select', 'eq', 'ilike', 'limit', 'order', 'or', 'in', 'insert', 'update', 'delete']) {
    query[method] = (...args) => {
      calls.push({ method, args })
      return query
    }
  }

  query.maybeSingle = () => query
  query.single = () => query
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  query.catch = (reject) => Promise.resolve(result).catch(reject)
  return query
}

function createClient({ plans = {}, rpcResult = { data: null, error: null }, authAdmin = {} } = {}) {
  const calls = []
  const rpcCalls = []
  const remainingPlans = Object.fromEntries(
    Object.entries(plans).map(([table, values]) => [table, [...values]]),
  )

  return {
    calls,
    rpcCalls,
    from(table) {
      const result = remainingPlans[table]?.shift() ?? { data: [], error: null }
      return chain(result, calls)
    },
    async rpc(name, input) {
      rpcCalls.push({ name, input })
      return rpcResult
    },
    auth: { admin: authAdmin },
  }
}

function adminAuth(supabase) {
  return {
    profile: { id: adminId, role: 'ADMIN', status: 'ACTIVE' },
    supabase,
  }
}

test('creates an Auth user before inserting its profile with the returned id', async () => {
  const userClient = createClient({
    plans: { profiles: [{ data: [], error: null }] },
  })
  let createdUserInput
  const adminClient = createClient({
    plans: {
      profiles: [{
        data: {
          id: teacherId,
          email: 'teacher@example.com',
          username: 'teacher01',
          full_name: 'Teacher One',
          role: 'TEACHER',
          status: 'ACTIVE',
          student_code: null,
        },
        error: null,
      }],
    },
    authAdmin: {
      async createUser(input) {
        createdUserInput = input
        return { data: { user: { id: teacherId } }, error: null }
      },
    },
  })

  const service = createAccountService({ adminClient })
  const result = await service.createAccount(adminAuth(userClient), {
    username: 'teacher01',
    full_name: 'Teacher One',
    email: 'Teacher@Example.com',
    role: 'TEACHER',
    status: 'ACTIVE',
  })

  assert.equal(result.id, teacherId)
  assert.equal(createdUserInput.email, 'teacher@example.com')
  assert.equal(adminClient.calls.some((call) => call.method === 'insert'), true)
})

test('deletes a newly created Auth user when profile creation fails', async () => {
  const userClient = createClient({
    plans: { profiles: [{ data: [], error: null }] },
  })
  const deletedUserIds = []
  const adminClient = createClient({
    plans: {
      profiles: [{ data: null, error: { code: '42501', message: 'insert denied' } }],
    },
    authAdmin: {
      async createUser() {
        return { data: { user: { id: teacherId } }, error: null }
      },
      async deleteUser(id) {
        deletedUserIds.push(id)
        return { data: {}, error: null }
      },
    },
  })

  const service = createAccountService({ adminClient })
  await assert.rejects(
    service.createAccount(adminAuth(userClient), {
      username: 'teacher01',
      full_name: 'Teacher One',
      email: 'teacher@example.com',
      role: 'TEACHER',
    }),
  )

  assert.deepEqual(deletedUserIds, [teacherId])
})

test('account deletion checks submission and teacher-review history with the service client', async () => {
  const userClient = createClient({
    plans: {
      profiles: [{
        data: { id: teacherId, email: 'teacher@example.com', role: 'TEACHER', status: 'ACTIVE' },
        error: null,
      }],
    },
  })
  let authDeleteCalled = false
  const adminClient = createClient({
    plans: {
      submissions: [{ data: null, count: 0, error: null }],
      teacher_reviews: [{ data: null, count: 1, error: null }],
    },
    authAdmin: {
      async deleteUser() {
        authDeleteCalled = true
        return { data: {}, error: null }
      },
    },
  })

  const service = createAccountService({ adminClient })
  await assert.rejects(
    service.deleteAccount(adminAuth(userClient), teacherId),
    (error) => error instanceof AppError && error.code === 'ACCOUNT_HAS_HISTORY',
  )
  assert.equal(authDeleteCalled, false)
})

test('account role changes are blocked while class or review history exists', async () => {
  const userClient = createClient({
    plans: {
      profiles: [{
        data: { id: teacherId, email: 'teacher@example.com', role: 'TEACHER', status: 'ACTIVE' },
        error: null,
      }],
    },
  })
  const adminClient = createClient({
    plans: {
      classes: [{ data: [{ id: classId }], error: null }],
      class_members: [{ data: [], error: null }],
      submissions: [{ data: [], error: null }],
      teacher_reviews: [{ data: [], error: null }],
    },
  })

  const service = createAccountService({ adminClient })
  await assert.rejects(
    service.updateAccount(adminAuth(userClient), teacherId, { role: 'STUDENT' }),
    (error) => error instanceof AppError && error.code === 'ACCOUNT_ROLE_CONFLICT',
  )
})

test('account role changes are blocked by submission history even after class removal', async () => {
  const userClient = createClient({
    plans: {
      profiles: [{
        data: { id: teacherId, email: 'student@example.com', role: 'STUDENT', status: 'ACTIVE' },
        error: null,
      }],
    },
  })
  const adminClient = createClient({
    plans: {
      classes: [{ data: [], error: null }],
      class_members: [{ data: [], error: null }],
      submissions: [{ data: [{ id: '77777777-7777-4777-8777-777777777777' }], error: null }],
      teacher_reviews: [{ data: [], error: null }],
    },
  })

  const service = createAccountService({ adminClient })
  await assert.rejects(
    service.updateAccount(adminAuth(userClient), teacherId, { role: 'TEACHER' }),
    (error) => error instanceof AppError && error.code === 'ACCOUNT_ROLE_CONFLICT',
  )
})

test('account list includes classes assigned to teachers and students', async () => {
  const client = createClient({
    plans: {
      profiles: [{
        data: [
          { id: teacherId, role: 'TEACHER', status: 'ACTIVE' },
          { id: studentId, role: 'STUDENT', status: 'ACTIVE' },
        ],
        error: null,
      }],
      classes: [{
        data: [{ id: classId, code: '10A1', teacher_id: teacherId }],
        error: null,
      }],
      class_members: [{
        data: [{
          student_id: studentId,
          classroom: { id: classId, code: '10A1' },
        }],
        error: null,
      }],
    },
  })

  const result = await createAccountService().listAccounts(adminAuth(client))

  assert.deepEqual(result.find((row) => row.id === teacherId).classes, [
    { id: classId, code: '10A1' },
  ])
  assert.deepEqual(result.find((row) => row.id === studentId).classes, [
    { id: classId, code: '10A1' },
  ])
})

test('import creates Auth users then uses one transactional RPC for profiles and memberships', async () => {
  const userClient = createClient({
    plans: {
      classes: [{ data: { id: classId }, error: null }],
      profiles: [{ data: null, error: null }],
      class_members: [{ data: [], error: null }],
    },
    rpcResult: {
      data: {
        created: 1,
        assigned: 0,
        skipped: 0,
        memberships: [{ class_id: classId, student_id: teacherId, student_number: '01' }],
      },
      error: null,
    },
  })
  const adminClient = createClient({
    authAdmin: {
      async createUser() {
        return { data: { user: { id: teacherId } }, error: null }
      },
    },
  })

  const service = createClassService({ adminClient })
  const result = await service.importStudents(adminAuth(userClient), classId, {
    students: [{ studentNumber: '01', name: 'Alice', email: 'alice@example.com' }],
  })

  assert.equal(userClient.rpcCalls[0].name, 'admin_import_students')
  assert.equal(result.created, 1)
  assert.equal(result.memberships.length, 1)
})

test('import rolls back every Auth user when the transactional RPC fails', async () => {
  const userClient = createClient({
    plans: {
      classes: [{ data: { id: classId }, error: null }],
      profiles: [{ data: null, error: null }],
      class_members: [{ data: [], error: null }],
    },
    rpcResult: { data: null, error: { code: 'P0001', message: 'IMPORT_FAILED' } },
  })
  const deletedUserIds = []
  const adminClient = createClient({
    authAdmin: {
      async createUser({ email }) {
        return { data: { user: { id: email.startsWith('a') ? teacherId : adminId } }, error: null }
      },
      async deleteUser(id) {
        deletedUserIds.push(id)
        return { data: {}, error: null }
      },
    },
  })

  const service = createClassService({ adminClient })
  await assert.rejects(
    service.importStudents(adminAuth(userClient), classId, {
      students: [
        { studentNumber: '01', name: 'Alice', email: 'alice@example.com' },
        { studentNumber: '02', name: 'Bob', email: 'bob@example.com' },
      ],
    }),
    (error) => error instanceof AppError && error.code === 'IMPORT_FAILED',
  )

  assert.deepEqual(deletedUserIds.sort(), [adminId, teacherId].sort())
})

test('import rejects an existing student when the name does not match', async () => {
  const userClient = createClient({
    plans: {
      classes: [{ data: { id: classId }, error: null }],
      profiles: [{ data: [{ id: teacherId, email: 'alice@example.com', role: 'STUDENT', status: 'ACTIVE', full_name: 'Alice One' }], error: null }],
      class_members: [{ data: [], error: null }],
    },
  })
  const service = createClassService({ adminClient: createClient() })

  await assert.rejects(
    service.importStudents(adminAuth(userClient), classId, {
      students: [{ studentNumber: '01', name: 'Alice Two', email: 'alice@example.com' }],
    }),
    (error) => error instanceof AppError && error.code === 'IMPORT_NAME_CONFLICT',
  )
})

test('import skips an existing membership without creating another Auth user', async () => {
  const userClient = createClient({
    plans: {
      classes: [{ data: { id: classId }, error: null }],
      profiles: [{ data: [{ id: teacherId, email: 'alice@example.com', role: 'STUDENT', status: 'ACTIVE', full_name: 'Alice One' }], error: null }],
      class_members: [{ data: [{ student_id: teacherId, student_number: '01' }], error: null }],
    },
  })
  const adminClient = createClient({
    authAdmin: {
      async createUser() {
        throw new Error('should not create an already enrolled student')
      },
    },
  })
  const service = createClassService({ adminClient })

  const result = await service.importStudents(adminAuth(userClient), classId, {
    students: [{ studentNumber: '09', name: 'Alice One', email: 'alice@example.com' }],
  })

  assert.equal(result.skipped, 1)
  assert.equal(result.memberships.length, 0)
})

test('class creation rejects a teacher that is not active', async () => {
  const userClient = createClient({
    plans: {
      classes: [
        { data: [], error: null },
        { data: null, error: null },
      ],
      profiles: [{ data: { id: teacherId, role: 'TEACHER', status: 'LOCKED' }, error: null }],
    },
  })
  const service = createClassService({ adminClient: createClient() })

  await assert.rejects(
    service.createClass(adminAuth(userClient), {
      code: '10A1',
      subject: 'Ngữ văn',
      semester: '1',
      school_year: '2026-2027',
      teacher_id: teacherId,
    }),
    (error) => error instanceof AppError && error.code === 'TEACHER_NOT_ACTIVE',
  )
})

test('class roster returns profile fields and the per-class student number', async () => {
  const userClient = createClient({
    plans: {
      classes: [{ data: { id: classId }, error: null }],
      class_members: [{
        data: [{
          class_id: classId,
          student_id: teacherId,
          student_number: '01',
          joined_at: '2026-09-14T00:00:00.000Z',
          student: { email: 'alice@example.com', username: 'alice01', full_name: 'Alice One', role: 'STUDENT', status: 'ACTIVE', student_code: null },
        }],
        error: null,
      }],
    },
  })
  const service = createClassService({ adminClient: createClient() })

  const result = await service.listStudents(adminAuth(userClient), classId)

  assert.deepEqual(result[0], {
    id: teacherId,
    email: 'alice@example.com',
    username: 'alice01',
    full_name: 'Alice One',
    role: 'STUDENT',
    status: 'ACTIVE',
    student_code: null,
    class_id: classId,
    student_number: '01',
    joined_at: '2026-09-14T00:00:00.000Z',
  })
})
