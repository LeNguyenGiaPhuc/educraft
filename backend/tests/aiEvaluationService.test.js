import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import {
  MOCK_AI_EVALUATION,
  createAiEvaluationService,
} from '../src/modules/ai-evaluations/aiEvaluationService.js'

const submissionIds = [
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
]
const teacherId = '22222222-2222-4222-8222-222222222222'

function evaluation(submissionId = submissionIds[0]) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    submission_id: submissionId,
    ...MOCK_AI_EVALUATION,
    missing_content: [...MOCK_AI_EVALUATION.missing_content],
    created_at: '2026-09-14T03:00:00Z',
    private_database_field: 'hidden',
  }
}

function createUserClient(results, events = []) {
  const queue = [...results]
  return {
    calls: [],
    from(table) {
      const call = { table, select: null, filters: [] }
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
        async maybeSingle() {
          events.push(`user:${table}:read`)
          return queue.shift()
        },
      }
      return builder
    },
  }
}

function createAdminClient(results, events = []) {
  const queue = [...results]
  return {
    calls: [],
    from(table) {
      const call = {
        table,
        operation: null,
        value: null,
        options: null,
        filters: [],
        select: null,
      }
      this.calls.push(call)
      const builder = {
        update(value) {
          call.operation = 'update'
          call.value = value
          return builder
        },
        upsert(value, options) {
          call.operation = 'upsert'
          call.value = value
          call.options = options
          return builder
        },
        eq(column, value) {
          call.filters.push(['eq', column, value])
          return builder
        },
        neq(column, value) {
          call.filters.push(['neq', column, value])
          return builder
        },
        select(columns) {
          call.select = columns
          return builder
        },
        async maybeSingle() {
          events.push(`admin:${table}:${call.operation}`)
          return queue.shift()
        },
        async single() {
          events.push(`admin:${table}:${call.operation}`)
          return queue.shift()
        },
      }
      return builder
    },
  }
}

function createSubmissionService({ statuses = ['SUBMITTED'], error = null, events = [] } = {}) {
  const queue = [...statuses]
  return {
    calls: [],
    async getSubmission(auth, submissionId) {
      this.calls.push({ auth, submissionId })
      events.push('authorize-submission')
      if (error) throw error
      return { id: submissionId, status: queue.shift() }
    },
  }
}

function teacherAuth(supabase, role = 'TEACHER') {
  return {
    profile: { id: teacherId, role },
    supabase,
  }
}

function buildService({
  userResults = [],
  adminResults = [],
  submissionStatuses,
  submissionError,
  logger = { error() {} },
} = {}) {
  const events = []
  const supabase = createUserClient(userResults, events)
  const adminClient = createAdminClient(adminResults, events)
  const submissionService = createSubmissionService({
    statuses: submissionStatuses,
    error: submissionError,
    events,
  })
  return {
    adminClient,
    events,
    submissionService,
    supabase,
    service: createAiEvaluationService({ adminClient, submissionService, logger }),
  }
}

test('assigned teacher runs deterministic PROCESSING to REQUIRES_REVIEW workflow', async () => {
  const savedEvaluation = evaluation()
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: savedEvaluation, error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
  })

  const result = await context.service.runMockEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.equal(result.submission_status, 'REQUIRES_REVIEW')
  assert.deepEqual(result.evaluation, {
    id: savedEvaluation.id,
    submission_id: submissionIds[0],
    coverage_score: 82,
    confidence: 0.84,
    suggested_status: 'REQUIRES_TEACHER_REVIEW',
    missing_content: ['Bổ sung phần kết luận.'],
    feedback_draft: MOCK_AI_EVALUATION.feedback_draft,
    model_name: 'educraft-mock-evaluator',
    model_version: '1.0',
    created_at: savedEvaluation.created_at,
  })
  assert.deepEqual(context.events, [
    'authorize-submission',
    'user:ai_evaluations:read',
    'admin:submissions:update',
    'admin:ai_evaluations:upsert',
    'admin:submissions:update',
  ])
  assert.deepEqual(
    context.adminClient.calls.filter((call) => call.table === 'submissions').map((call) => call.value),
    [{ status: 'PROCESSING' }, { status: 'REQUIRES_REVIEW' }],
  )
  const persistence = context.adminClient.calls[1]
  assert.equal(persistence.operation, 'upsert')
  assert.equal(persistence.options.onConflict, 'submission_id')
  assert.deepEqual(persistence.value, {
    submission_id: submissionIds[0],
    coverage_score: 82,
    confidence: 0.84,
    suggested_status: 'REQUIRES_TEACHER_REVIEW',
    missing_content: ['Bổ sung phần kết luận.'],
    feedback_draft: MOCK_AI_EVALUATION.feedback_draft,
    model_name: 'educraft-mock-evaluator',
    model_version: '1.0',
  })
  assert.equal(context.adminClient.calls.some((call) => call.table === 'teacher_reviews'), false)
  assert.equal(JSON.stringify(context.adminClient.calls).includes('FINALIZED'), true)
  assert.equal(context.adminClient.calls.some((call) => call.value?.status === 'FINALIZED'), false)
})

test('existing evaluation is returned idempotently without creating a duplicate', async () => {
  const existing = evaluation()
  const context = buildService({
    submissionStatuses: ['REQUIRES_REVIEW', 'REQUIRES_REVIEW'],
    userResults: [
      { data: existing, error: null },
      { data: existing, error: null },
    ],
  })

  const first = await context.service.runMockEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )
  const second = await context.service.runMockEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.deepEqual(first, second)
  assert.equal(context.adminClient.calls.length, 0)
  assert.equal(context.supabase.calls.length, 2)
})

test('assigned teacher reads an existing suggestion through user-scoped Supabase', async () => {
  const existing = evaluation()
  const context = buildService({
    userResults: [{ data: existing, error: null }],
  })

  const result = await context.service.getEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.equal(result.id, existing.id)
  assert.equal(Object.hasOwn(result, 'private_database_field'), false)
  assert.deepEqual(context.supabase.calls[0].filters, [
    ['submission_id', submissionIds[0]],
  ])
  assert.equal(context.adminClient.calls.length, 0)
  assert.equal(context.events[0], 'authorize-submission')
})

test('unassigned teacher is rejected before user AI reads or admin persistence', async () => {
  const forbidden = new AppError(403, 'CLASS_FORBIDDEN', 'Forbidden')
  const context = buildService({ submissionError: forbidden })

  await assert.rejects(
    context.service.runMockEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    forbidden,
  )
  assert.deepEqual(context.events, ['authorize-submission'])
  assert.equal(context.supabase.calls.length, 0)
  assert.equal(context.adminClient.calls.length, 0)
})

test('service rejects a Student before authorization or persistence', async () => {
  const context = buildService()

  await assert.rejects(
    context.service.runMockEvaluation(
      teacherAuth(context.supabase, 'STUDENT'),
      submissionIds[0],
    ),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  )
  assert.equal(context.submissionService.calls.length, 0)
  assert.equal(context.adminClient.calls.length, 0)
})

test('FINALIZED and unsupported submission states cannot be changed', async () => {
  for (const [status, code] of [
    ['FINALIZED', 'SUBMISSION_FINALIZED'],
    ['FAILED', 'AI_EVALUATION_STATE_INVALID'],
  ]) {
    const context = buildService({ submissionStatuses: [status] })

    await assert.rejects(
      context.service.runMockEvaluation(teacherAuth(context.supabase), submissionIds[0]),
      (error) => error.status === 409 && error.code === code,
    )
    assert.equal(context.supabase.calls.length, 0)
    assert.equal(context.adminClient.calls.length, 0)
  }
})

test('attempt evaluations remain scoped to each requested submission ID', async () => {
  const context = buildService({
    submissionStatuses: ['SUBMITTED', 'SUBMITTED'],
    userResults: [
      { data: null, error: null },
      { data: null, error: null },
    ],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(submissionIds[0]), error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
      { data: { id: submissionIds[1], status: 'PROCESSING' }, error: null },
      { data: evaluation(submissionIds[1]), error: null },
      { data: { id: submissionIds[1], status: 'REQUIRES_REVIEW' }, error: null },
    ],
  })

  for (const submissionId of submissionIds) {
    await context.service.runMockEvaluation(teacherAuth(context.supabase), submissionId)
  }

  const upserts = context.adminClient.calls.filter((call) => call.operation === 'upsert')
  assert.deepEqual(upserts.map((call) => call.value.submission_id), submissionIds)
  for (const submissionId of submissionIds) {
    const callsForAttempt = context.adminClient.calls.filter((call) => (
      call.filters.some((filter) => filter[1] === 'id' && filter[2] === submissionId)
      || call.value?.submission_id === submissionId
    ))
    assert.equal(callsForAttempt.length, 3)
  }
})

test('evaluation persistence failure restores SUBMITTED and never reaches review', async () => {
  const persistenceError = { code: 'DB_FAILURE', message: 'private database detail' }
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: null, error: persistenceError },
      { data: { id: submissionIds[0], status: 'SUBMITTED' }, error: null },
    ],
  })

  await assert.rejects(
    context.service.runMockEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    (error) => error.code === 'AI_EVALUATION_SAVE_FAILED'
      && !error.message.includes('private'),
  )
  assert.deepEqual(
    context.adminClient.calls.filter((call) => call.table === 'submissions').map((call) => call.value),
    [{ status: 'PROCESSING' }, { status: 'SUBMITTED' }],
  )
  assert.equal(
    context.adminClient.calls.some((call) => call.value?.status === 'REQUIRES_REVIEW'),
    false,
  )
})

test('status recovery failure is safely logged and explicitly surfaced', async () => {
  const logger = { entries: [], error(entry) { this.entries.push(entry) } }
  const context = buildService({
    logger,
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: null, error: { code: 'DB_SAVE_FAILED', message: 'save secret' } },
      { data: null, error: { code: 'DB_RECOVERY_FAILED', message: 'recovery secret' } },
    ],
  })

  await assert.rejects(
    context.service.runMockEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    (error) => error.code === 'AI_EVALUATION_ROLLBACK_FAILED',
  )
  assert.deepEqual(logger.entries, [{
    event: 'mock_ai_status_recovery_failed',
    submissionId: submissionIds[0],
    errorCode: 'AI_STATUS_UPDATE_FAILED',
  }])
  assert.equal(JSON.stringify(logger.entries).includes('secret'), false)
})

test('final status failure leaves a saved evaluation in retriable PROCESSING state', async () => {
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(), error: null },
      { data: null, error: { code: 'DB_STATUS_FAILED', message: 'private status detail' } },
    ],
  })

  await assert.rejects(
    context.service.runMockEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    (error) => error.code === 'AI_STATUS_UPDATE_FAILED'
      && !error.message.includes('private'),
  )
  assert.equal(context.adminClient.calls[1].operation, 'upsert')
  assert.equal(
    context.adminClient.calls.some((call) => call.value?.status === 'FINALIZED'),
    false,
  )
})

test('missing and failed evaluation reads return stable safe errors', async () => {
  const missingContext = buildService({
    userResults: [{ data: null, error: null }],
  })
  await assert.rejects(
    missingContext.service.getEvaluation(
      teacherAuth(missingContext.supabase),
      submissionIds[0],
    ),
    (error) => error.status === 404 && error.code === 'AI_EVALUATION_NOT_FOUND',
  )

  const failedContext = buildService({
    userResults: [{ data: null, error: { message: 'private read detail' } }],
  })
  await assert.rejects(
    failedContext.service.getEvaluation(
      teacherAuth(failedContext.supabase),
      submissionIds[0],
    ),
    (error) => error.code === 'AI_EVALUATION_READ_FAILED'
      && !error.message.includes('private'),
  )
})
