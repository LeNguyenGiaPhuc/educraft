import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createSubmissionService } from '../src/modules/submissions/submissionService.js'

const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherAssignmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const classId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const studentId = '33333333-3333-4333-8333-333333333333'
const otherStudentId = '55555555-5555-4555-8555-555555555555'
const teacherId = '22222222-2222-4222-8222-222222222222'
const submissionIds = [
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
]

function file(submissionId, attemptNumber) {
  return {
    id: `file-${attemptNumber}`,
    submission_id: submissionId,
    storage_path: `${submissionId}/attempt-${attemptNumber}.png`,
    original_filename: `attempt-${attemptNumber}.png`,
    mime_type: 'image/png',
    size_bytes: 100 + attemptNumber,
    page_order: 1,
    created_at: `2026-09-14T00:00:0${attemptNumber}Z`,
    internal_storage_secret: 'hidden',
  }
}

function review({ finalized = false } = {}) {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    final_status: finalized ? 'COMPLETED' : 'NEEDS_COMPLETION',
    final_score: finalized ? 91 : 42,
    feedback: finalized ? 'Đã hoàn thành.' : 'Bản nháp nội bộ.',
    is_finalized: finalized,
    finalized_at: finalized ? '2026-09-14T02:00:00Z' : null,
    updated_at: '2026-09-14T02:00:00Z',
    private_review_note: 'hidden',
  }
}

function submission(attemptNumber, overrides = {}) {
  const id = submissionIds[attemptNumber - 1]
  return {
    id,
    assignment_id: assignmentId,
    student_id: studentId,
    attempt_number: attemptNumber,
    status: 'SUBMITTED',
    submitted_at: `2026-09-14T00:00:0${attemptNumber}Z`,
    created_at: `2026-09-14T00:00:0${attemptNumber}Z`,
    updated_at: `2026-09-14T00:00:0${attemptNumber}Z`,
    submission_files: [file(id, attemptNumber)],
    teacher_reviews: [],
    ai_evaluations: [{ confidence: 0.99, feedback_draft: 'AI draft' }],
    ...overrides,
  }
}

function createReadSupabase(results) {
  const queue = [...results]
  return {
    calls: [],
    from(table) {
      const call = { table, select: null, filters: [], orders: [] }
      this.calls.push(call)
      const builder = {
        select(columns) {
          call.select = columns
          return builder
        },
        eq(column, value) {
          call.filters.push([column, value])
          return builder
        },
        order(column, options) {
          call.orders.push([column, options])
          return builder
        },
        maybeSingle() {
          return Promise.resolve(queue.shift())
        },
        then(resolve, reject) {
          return Promise.resolve(queue.shift()).then(resolve, reject)
        },
      }
      return builder
    },
  }
}

function createAssignmentService(error = null) {
  return {
    calls: [],
    async getAssignment(auth, requestedAssignmentId) {
      this.calls.push({ auth, assignmentId: requestedAssignmentId })
      if (error) throw error
      return { id: requestedAssignmentId, class_id: classId }
    },
  }
}

function createService(supabase, assignmentService = createAssignmentService()) {
  return {
    assignmentService,
    service: createSubmissionService({
      adminClient: {},
      assignmentService,
      storageService: {
        async createSignedUrl({ path }) {
          return `https://signed.test/${path}`
        },
      },
      logger: { error() {} },
    }),
    studentAuth: {
      profile: { id: studentId, role: 'STUDENT' },
      supabase,
    },
    teacherAuth: {
      profile: { id: teacherId, role: 'TEACHER' },
      supabase,
    },
  }
}

function accessibleAssignment(status = 'OPEN', dueAt = '2026-09-20T00:00:00Z') {
  return {
    data: { id: assignmentId, class_id: classId, status, due_at: dueAt },
    error: null,
  }
}

function membership() {
  return { data: { class_id: classId, student_id: studentId }, error: null }
}

test('student history keeps attempts 1, 2, and 3 separate in requested order', async () => {
  const attempts = [submission(1), submission(2), submission(3)]
  const supabase = createReadSupabase([
    accessibleAssignment(),
    membership(),
    { data: attempts, error: null },
  ])
  const { service, studentAuth } = createService(supabase)

  const result = await service.listOwnSubmissions(studentAuth, assignmentId)

  assert.deepEqual(result.map((item) => item.attempt_number), [1, 2, 3])
  assert.equal(new Set(result.map((item) => item.id)).size, 3)
  assert.equal(
    result[0].files[0].signed_url,
    `https://signed.test/${submissionIds[0]}/attempt-1.png`,
  )
  const submissionsQuery = supabase.calls[2]
  assert.deepEqual(submissionsQuery.filters, [
    ['assignment_id', assignmentId],
    ['student_id', studentId],
  ])
  assert.deepEqual(submissionsQuery.orders, [
    ['attempt_number', { ascending: true }],
    ['submitted_at', { ascending: true }],
    ['id', { ascending: true }],
  ])
})

test('student projection excludes other students and every AI draft field', async () => {
  const own = submission(1, {
    status: 'REQUIRES_REVIEW',
    teacher_reviews: [review({ finalized: false })],
  })
  const other = submission(2, {
    student_id: otherStudentId,
    ai_evaluations: [{ coverage_score: 95, confidence: 0.98 }],
  })
  const supabase = createReadSupabase([
    accessibleAssignment(),
    membership(),
    { data: [own, other], error: null },
  ])
  const { service, studentAuth } = createService(supabase)

  const result = await service.listOwnSubmissions(studentAuth, assignmentId)

  assert.equal(result.length, 1)
  assert.equal(result[0].id, own.id)
  assert.equal(result[0].status, 'REQUIRES_REVIEW')
  assert.equal(Object.hasOwn(result[0], 'student_id'), false)
  assert.equal(Object.hasOwn(result[0], 'teacher_result'), false)
  assert.equal(JSON.stringify(result).includes('AI draft'), false)
  assert.equal(JSON.stringify(result).includes('confidence'), false)
  assert.equal(JSON.stringify(result).includes('Bản nháp nội bộ'), false)
})

test('student sees only a finalized teacher result', async () => {
  const finalized = submission(2, {
    teacher_reviews: [review({ finalized: true })],
  })
  const supabase = createReadSupabase([
    accessibleAssignment(),
    membership(),
    { data: [finalized], error: null },
  ])
  const { service, studentAuth } = createService(supabase)

  const [result] = await service.listOwnSubmissions(studentAuth, assignmentId)

  assert.deepEqual(result.teacher_result, {
    final_status: 'COMPLETED',
    final_score: 91,
    feedback: 'Đã hoàn thành.',
    is_finalized: true,
    finalized_at: '2026-09-14T02:00:00Z',
  })
  assert.equal(Object.hasOwn(result.teacher_result, 'private_review_note'), false)
})

test('only the selected finalized attempt exposes its Teacher result', async () => {
  const finalizedAttempt = submission(1, {
    status: 'FINALIZED',
    teacher_reviews: [review({ finalized: true })],
  })
  const laterAttempt = submission(2, {
    status: 'REQUIRES_REVIEW',
    teacher_reviews: [review({ finalized: false })],
  })
  const supabase = createReadSupabase([
    accessibleAssignment(),
    membership(),
    { data: [finalizedAttempt, laterAttempt], error: null },
  ])
  const { service, studentAuth } = createService(supabase)

  const result = await service.listOwnSubmissions(studentAuth, assignmentId)

  assert.equal(result[0].status, 'FINALIZED')
  assert.equal(result[0].teacher_result.final_status, 'COMPLETED')
  assert.equal(result[1].status, 'REQUIRES_REVIEW')
  assert.equal(Object.hasOwn(result[1], 'teacher_result'), false)
  assert.equal(JSON.stringify(result).includes('AI draft'), false)
})

test('closed and expired assignments remain readable because reads do not check availability', async () => {
  for (const assignment of [
    accessibleAssignment('CLOSED', '2026-09-20T00:00:00Z'),
    accessibleAssignment('OPEN', '2026-09-13T00:00:00Z'),
  ]) {
    const supabase = createReadSupabase([
      assignment,
      membership(),
      { data: [submission(1)], error: null },
    ])
    const { service, studentAuth } = createService(supabase)

    const result = await service.listOwnSubmissions(studentAuth, assignmentId)

    assert.equal(result.length, 1)
    assert.equal(supabase.calls.some((call) => (
      call.filters.some(([column]) => ['status', 'due_at'].includes(column))
    )), false)
  }
})

test('student without current membership is rejected before submissions are queried', async () => {
  const supabase = createReadSupabase([
    accessibleAssignment(),
    { data: null, error: null },
  ])
  const { service, studentAuth } = createService(supabase)

  await assert.rejects(
    service.listOwnSubmissions(studentAuth, assignmentId),
    (error) => error.status === 403 && error.code === 'CLASS_MEMBERSHIP_REQUIRED',
  )
  assert.deepEqual(supabase.calls.map((call) => call.table), ['assignments', 'class_members'])
})

test('RLS-hidden student assignment is returned as not found without querying history', async () => {
  const supabase = createReadSupabase([{ data: null, error: null }])
  const { service, studentAuth } = createService(supabase)

  await assert.rejects(
    service.listOwnSubmissions(studentAuth, otherAssignmentId),
    (error) => error.status === 404 && error.code === 'ASSIGNMENT_NOT_FOUND',
  )
  assert.equal(supabase.calls.length, 1)
})

test('student cannot read another student submission detail', async () => {
  const otherSubmission = submission(1, { student_id: otherStudentId })
  const supabase = createReadSupabase([{ data: otherSubmission, error: null }])
  const { service, studentAuth } = createService(supabase)

  await assert.rejects(
    service.getSubmission(studentAuth, otherSubmission.id),
    (error) => error.status === 404 && error.code === 'SUBMISSION_NOT_FOUND',
  )
  assert.deepEqual(supabase.calls[0].filters, [
    ['id', otherSubmission.id],
    ['student_id', studentId],
  ])
})

test('student detail rechecks current assignment membership before returning own data', async () => {
  const ownSubmission = submission(1)
  const supabase = createReadSupabase([
    { data: ownSubmission, error: null },
    accessibleAssignment(),
    { data: null, error: null },
  ])
  const { service, studentAuth } = createService(supabase)

  await assert.rejects(
    service.getSubmission(studentAuth, ownSubmission.id),
    (error) => error.code === 'CLASS_MEMBERSHIP_REQUIRED',
  )
})

test('assigned teacher sees all students and resubmissions with a safe projection', async () => {
  const firstStudentAttempt = submission(1, {
    teacher_reviews: [review({ finalized: false })],
    student: {
      id: studentId,
      full_name: 'Nguyễn Văn An',
      student_code: 'HS001',
      email: 'private@example.com',
      status: 'ACTIVE',
    },
  })
  const secondStudentAttempt = submission(2, {
    student_id: otherStudentId,
    student: {
      id: otherStudentId,
      full_name: 'Trần Thị Bình',
      student_code: 'HS002',
      email: 'private2@example.com',
    },
  })
  const supabase = createReadSupabase([{ data: [firstStudentAttempt, secondStudentAttempt], error: null }])
  const { service, teacherAuth, assignmentService } = createService(supabase)

  const result = await service.listAssignmentSubmissions(teacherAuth, assignmentId)

  assert.equal(result.length, 2)
  assert.deepEqual(result.map((item) => item.attempt_number), [1, 2])
  assert.equal(result[0].teacher_review.is_finalized, false)
  assert.equal(result[0].student.full_name, 'Nguyễn Văn An')
  assert.equal(Object.hasOwn(result[0].student, 'email'), false)
  assert.equal(JSON.stringify(result).includes('ai_evaluations'), false)
  assert.equal(assignmentService.calls[0].assignmentId, assignmentId)
  assert.deepEqual(supabase.calls[0].orders, [
    ['submitted_at', { ascending: true }],
    ['student_id', { ascending: true }],
    ['attempt_number', { ascending: true }],
    ['id', { ascending: true }],
  ])
})

test('assigned teacher can read submission detail after assignment ownership is checked', async () => {
  const teacherSubmission = submission(1, {
    student: { id: studentId, full_name: 'Nguyễn Văn An', student_code: 'HS001' },
  })
  const supabase = createReadSupabase([{ data: teacherSubmission, error: null }])
  const { service, teacherAuth, assignmentService } = createService(supabase)

  const result = await service.getSubmission(teacherAuth, teacherSubmission.id)

  assert.equal(result.id, teacherSubmission.id)
  assert.equal(result.student_id, studentId)
  assert.equal(assignmentService.calls[0].assignmentId, assignmentId)
})

test('unassigned teacher is rejected before listing or returning submission data', async () => {
  const forbidden = new AppError(403, 'CLASS_FORBIDDEN', 'Forbidden')
  const assignmentService = createAssignmentService(forbidden)
  const listSupabase = createReadSupabase([])
  const listContext = createService(listSupabase, assignmentService)

  await assert.rejects(
    listContext.service.listAssignmentSubmissions(listContext.teacherAuth, assignmentId),
    (error) => error.code === 'CLASS_FORBIDDEN',
  )
  assert.equal(listSupabase.calls.length, 0)

  const detailSupabase = createReadSupabase([{ data: submission(1), error: null }])
  const detailContext = createService(detailSupabase, assignmentService)
  await assert.rejects(
    detailContext.service.getSubmission(detailContext.teacherAuth, submissionIds[0]),
    (error) => error.code === 'CLASS_FORBIDDEN',
  )
})

test('database read errors propagate without returning partial data', async () => {
  const databaseError = new Error('private database detail')
  const supabase = createReadSupabase([{ data: null, error: databaseError }])
  const { service, studentAuth } = createService(supabase)

  await assert.rejects(
    service.listOwnSubmissions(studentAuth, assignmentId),
    databaseError,
  )
})
