import assert from 'node:assert/strict'
import test from 'node:test'

import { createAssignmentService } from '../src/modules/assignments/assignmentService.js'

const teacherId = '22222222-2222-4222-8222-222222222222'
const otherTeacherId = '33333333-3333-4333-8333-333333333333'
const classId = '11111111-1111-4111-8111-111111111111'
const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const futureDueAt = '2026-09-18T23:59:00+07:00'
const pastDueAt = '2026-09-12T23:59:00+07:00'
const assignment = {
  id: assignmentId,
  class_id: classId,
  created_by: teacherId,
  title: 'Bài ghi Nam Xương',
  due_at: futureDueAt,
  coverage_threshold: 80,
  status: 'OPEN',
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
}

function createQueuedSupabase(results) {
  const calls = []
  let resultIndex = 0

  function nextResult() {
    const result = results[resultIndex]
    resultIndex += 1
    return Promise.resolve(result)
  }

  return {
    calls,
    from(table) {
      const call = { table, operation: 'select', filters: [] }
      calls.push(call)

      const builder = {
        select(columns) {
          call.columns = columns
          return builder
        },
        eq(column, value) {
          call.filters.push([column, value])
          return builder
        },
        order(column, options) {
          call.order = [column, options]
          return nextResult()
        },
        insert(value) {
          call.operation = 'insert'
          call.value = value
          return builder
        },
        update(value) {
          call.operation = 'update'
          call.value = value
          return builder
        },
        delete() {
          call.operation = 'delete'
          return builder
        },
        maybeSingle() {
          return nextResult()
        },
        single() {
          return nextResult()
        },
      }

      return builder
    },
  }
}

function teacherAuth(supabase) {
  return {
    profile: { id: teacherId, role: 'TEACHER' },
    supabase,
  }
}

function assignedClass() {
  return { data: { id: classId, teacher_id: teacherId }, error: null }
}

test('assigned teacher lists assignments for their class', async () => {
  const supabase = createQueuedSupabase([
    assignedClass(),
    { data: [assignment], error: null },
  ])
  const service = createAssignmentService()

  const result = await service.listAssignmentsForClass(teacherAuth(supabase), classId)

  assert.deepEqual(result, [assignment])
  assert.deepEqual(supabase.calls[1].filters, [['class_id', classId]])
})

test('assigned teacher gets an assignment after its class is checked', async () => {
  const supabase = createQueuedSupabase([
    { data: assignment, error: null },
    assignedClass(),
  ])
  const service = createAssignmentService()

  assert.deepEqual(
    await service.getAssignment(teacherAuth(supabase), assignmentId),
    assignment,
  )
})

test('create derives class and creator from authenticated context', async () => {
  const created = { ...assignment, status: 'DRAFT' }
  const supabase = createQueuedSupabase([
    assignedClass(),
    { data: created, error: null },
  ])
  const service = createAssignmentService({ now: () => Date.parse('2026-09-14T00:00:00Z') })

  const result = await service.createAssignment(teacherAuth(supabase), classId, {
    title: created.title,
    due_at: created.due_at,
    coverage_threshold: 80,
    status: 'DRAFT',
    created_by: otherTeacherId,
    teacherId: otherTeacherId,
  })

  const insert = supabase.calls.find((call) => call.operation === 'insert')
  assert.equal(result, created)
  assert.equal(insert.value.class_id, classId)
  assert.equal(insert.value.created_by, teacherId)
  assert.equal(Object.hasOwn(insert.value, 'teacherId'), false)
})

test('assigned teacher updates allowed fields without moving the assignment', async () => {
  const updated = { ...assignment, title: 'Tên mới' }
  const supabase = createQueuedSupabase([
    { data: assignment, error: null },
    assignedClass(),
    { data: updated, error: null },
  ])
  const service = createAssignmentService({ now: () => Date.parse('2026-09-14T00:00:00Z') })

  const result = await service.updateAssignment(
    teacherAuth(supabase),
    assignmentId,
    { title: 'Tên mới' },
  )

  const update = supabase.calls.find((call) => call.operation === 'update')
  assert.deepEqual(result, updated)
  assert.deepEqual(update.value, { title: 'Tên mới' })
})

test('assigned teacher deletes an assignment after ownership is checked', async () => {
  const supabase = createQueuedSupabase([
    { data: assignment, error: null },
    assignedClass(),
    { data: assignment, error: null },
  ])
  const service = createAssignmentService()

  const result = await service.deleteAssignment(teacherAuth(supabase), assignmentId)

  assert.equal(result, assignment)
  assert.equal(supabase.calls[2].operation, 'delete')
})

test('teacher not assigned to a visible class receives a forbidden error', async () => {
  const supabase = createQueuedSupabase([{
    data: { id: classId, teacher_id: otherTeacherId },
    error: null,
  }])
  const service = createAssignmentService()

  await assert.rejects(
    service.listAssignmentsForClass(teacherAuth(supabase), classId),
    (error) => error.status === 403 && error.code === 'CLASS_FORBIDDEN',
  )
})

test('teacher cannot read, update, or delete an assignment in another teacher class', async () => {
  const operations = [
    (service, auth) => service.getAssignment(auth, assignmentId),
    (service, auth) => service.updateAssignment(auth, assignmentId, { title: 'Không được phép' }),
    (service, auth) => service.deleteAssignment(auth, assignmentId),
  ]

  for (const operation of operations) {
    const supabase = createQueuedSupabase([
      { data: assignment, error: null },
      { data: { id: classId, teacher_id: otherTeacherId }, error: null },
    ])
    const service = createAssignmentService()

    await assert.rejects(
      operation(service, teacherAuth(supabase)),
      (error) => error.status === 403 && error.code === 'CLASS_FORBIDDEN',
    )
  }
})

test('RLS-hidden classes and assignments use not-found errors', async () => {
  const service = createAssignmentService()

  await assert.rejects(
    service.listAssignmentsForClass(
      teacherAuth(createQueuedSupabase([{ data: null, error: null }])),
      classId,
    ),
    (error) => error.status === 404 && error.code === 'CLASS_NOT_FOUND',
  )
  await assert.rejects(
    service.getAssignment(
      teacherAuth(createQueuedSupabase([{ data: null, error: null }])),
      assignmentId,
    ),
    (error) => error.status === 404 && error.code === 'ASSIGNMENT_NOT_FOUND',
  )
})

test('creating or retaining OPEN status at the deadline is rejected', async () => {
  const deadline = Date.parse(pastDueAt)
  const service = createAssignmentService({ now: () => deadline })
  const createSupabase = createQueuedSupabase([assignedClass()])

  await assert.rejects(
    service.createAssignment(teacherAuth(createSupabase), classId, {
      title: assignment.title,
      due_at: pastDueAt,
      coverage_threshold: 80,
      status: 'OPEN',
    }),
    (error) => error.status === 422 && error.code === 'ASSIGNMENT_DEADLINE_REACHED',
  )

  const updateSupabase = createQueuedSupabase([
    { data: { ...assignment, due_at: pastDueAt }, error: null },
    assignedClass(),
  ])
  await assert.rejects(
    service.updateAssignment(teacherAuth(updateSupabase), assignmentId, { title: 'Tên mới' }),
    (error) => error.status === 422 && error.code === 'ASSIGNMENT_DEADLINE_REACHED',
  )
})

test('database failures are propagated for the shared error handler', async () => {
  const databaseError = new Error('database unavailable')
  const supabase = createQueuedSupabase([{ data: null, error: databaseError }])
  const service = createAssignmentService()

  await assert.rejects(
    service.listAssignmentsForClass(teacherAuth(supabase), classId),
    databaseError,
  )
})
