import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import {
  createAiEvaluationService,
  createAssignmentEvaluationInvalidator,
} from '../src/modules/ai-evaluations/aiEvaluationService.js'

const submissionIds = [
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
]
const teacherId = '22222222-2222-4222-8222-222222222222'

const PROVIDER_RESULT = Object.freeze({
  coverage_score: 82,
  confidence: 0.84,
  suggested_status: 'REQUIRES_TEACHER_REVIEW',
  missing_content: Object.freeze(['Bổ sung phần kết luận.']),
  feedback_draft: 'Bài ghi đủ ý chính, cần giáo viên xem lại phần kết luận.',
  reference_transcription: 'Bản chép từ bài mẫu.',
  student_transcription: 'Bản chép từ bài nộp.',
  uncertain_content: Object.freeze([]),
  provider: 'ollama',
  model_name: 'qwen3-vl:2b',
  model_version: '1.0',
  prompt_version: 'handwriting-v1',
  latency_ms: 0,
})

const CHECKER_RESULT = Object.freeze({
  status: 'PASSED',
  summary: 'Đề xuất có căn cứ trong bản chép.',
  findings: Object.freeze([]),
})

function evaluation(submissionId = submissionIds[0]) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    submission_id: submissionId,
    ...PROVIDER_RESULT,
    missing_content: [...PROVIDER_RESULT.missing_content],
    uncertain_content: [...PROVIDER_RESULT.uncertain_content],
    checker_status: 'PASSED',
    checker_summary: CHECKER_RESULT.summary,
    checker_findings: [],
    checker_prompt_version: 'handwriting-checker-v2',
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
        delete() {
          call.operation = 'delete'
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
        in(column, value) {
          call.filters.push(['in', column, value])
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
        then(resolve, reject) {
          events.push(`admin:${table}:${call.operation ?? 'select'}`)
          return Promise.resolve(queue.shift()).then(resolve, reject)
        },
      }
      return builder
    },
  }
}

test('reference changes invalidate cached AI rows and reopen reviewable submissions', async () => {
  const adminClient = createAdminClient([
    { data: submissionIds.map((id) => ({ id })), error: null },
    { data: null, error: null },
    { data: null, error: null },
  ])
  const invalidate = createAssignmentEvaluationInvalidator({ adminClient })

  const result = await invalidate('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

  assert.deepEqual(result, { invalidated: 2 })
  assert.deepEqual(adminClient.calls.map((call) => ({
    table: call.table,
    operation: call.operation,
    filters: call.filters,
  })), [
    {
      table: 'submissions', operation: null,
      filters: [['eq', 'assignment_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']],
    },
    {
      table: 'ai_evaluations', operation: 'delete',
      filters: [['in', 'submission_id', submissionIds]],
    },
    {
      table: 'submissions', operation: 'update',
      filters: [
        ['in', 'id', submissionIds],
        ['eq', 'status', 'REQUIRES_REVIEW'],
      ],
    },
  ])
})

function createSubmissionService({ statuses = ['SUBMITTED'], error = null, events = [] } = {}) {
  const queue = [...statuses]
  return {
    calls: [],
    async getSubmission(auth, submissionId) {
      this.calls.push({ auth, submissionId })
      events.push('authorize-submission')
      if (error) throw error
      return {
        id: submissionId,
        assignment_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        status: queue.shift(),
        files: [{
          storage_path: `${submissionId}/page-1.jpg`,
          mime_type: 'image/jpeg',
          size_bytes: 10,
          page_order: 1,
        }],
      }
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
  provider,
  inputService,
  assignmentService,
  logger = { error() {} },
  usageRecorder = { async record() {} },
} = {}) {
  const events = []
  const supabase = createUserClient(userResults, events)
  const adminClient = createAdminClient(adminResults, events)
  const submissionService = createSubmissionService({
    statuses: submissionStatuses,
    error: submissionError,
    events,
  })
  const defaultInputService = {
    async loadEvaluationInput(_auth, submission) {
      events.push('load-evaluation-input')
      return {
        assignmentTitle: 'Lực ma sát',
        coverageThreshold: 80,
        referenceImages: [{
          buffer: Buffer.from('reference'),
          mimeType: 'image/jpeg',
          order: 1,
        }],
        submissionImages: submission.files.map((file) => ({
          buffer: Buffer.from('submission'),
          mimeType: file.mime_type,
          order: file.page_order,
        })),
      }
    },
  }
  const defaultAssignmentService = {
    async getAssignment() {
      return { coverage_threshold: 80 }
    },
  }
  const defaultProvider = {
    async evaluate(input, options = {}) {
      events.push('provider:evaluate')
      assert.equal(input.assignmentTitle, 'Lực ma sát')
      options.onInteraction?.({
        stage: 'evaluation',
        status: 'SUCCEEDED',
        provider: 'ollama',
        model_name: 'qwen3-vl:2b',
        prompt_version: 'handwriting-v1',
        input_tokens: 20,
        output_tokens: 10,
        latency_ms: 5,
        cost_usd: 0,
      })
      return {
        ...PROVIDER_RESULT,
        missing_content: [...PROVIDER_RESULT.missing_content],
        uncertain_content: [],
      }
    },
    async check(input, options = {}) {
      events.push('provider:check')
      assert.equal(input.student_transcription, 'Bản chép từ bài nộp.')
      options.onInteraction?.({
        stage: 'checker',
        status: 'SUCCEEDED',
        provider: 'ollama',
        model_name: 'qwen3-vl:2b',
        prompt_version: 'handwriting-checker-v2',
        input_tokens: 15,
        output_tokens: 5,
        latency_ms: 3,
        cost_usd: 0,
      })
      return { ...CHECKER_RESULT, findings: [] }
    },
  }
  return {
    adminClient,
    events,
    submissionService,
    supabase,
    service: createAiEvaluationService({
      adminClient,
      assignmentService: assignmentService ?? defaultAssignmentService,
      submissionService,
      inputService: inputService ?? defaultInputService,
      provider: provider ?? defaultProvider,
      logger,
      usageRecorder,
    }),
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

  const result = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.equal(result.submission_status, 'REQUIRES_REVIEW')
  assert.deepEqual(result.evaluation, {
    id: savedEvaluation.id,
    submission_id: submissionIds[0],
    coverage_score: 82,
    confidence: 0.84,
    suggested_status: 'COMPLETED',
    missing_content: ['Bổ sung phần kết luận.'],
    feedback_draft: PROVIDER_RESULT.feedback_draft,
    provider: 'ollama',
    prompt_version: 'handwriting-v1',
    latency_ms: 0,
    reference_transcription: 'Bản chép từ bài mẫu.',
    student_transcription: 'Bản chép từ bài nộp.',
    uncertain_content: [],
    model_name: 'qwen3-vl:2b',
    model_version: '1.0',
    checker_status: 'PASSED',
    checker_summary: CHECKER_RESULT.summary,
    checker_findings: [],
    checker_prompt_version: 'handwriting-checker-v2',
    created_at: savedEvaluation.created_at,
  })
  assert.deepEqual(context.events, [
    'authorize-submission',
    'user:ai_evaluations:read',
    'load-evaluation-input',
    'admin:submissions:update',
    'provider:evaluate',
    'provider:check',
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
    suggested_status: 'COMPLETED',
    missing_content: ['Bổ sung phần kết luận.'],
    feedback_draft: PROVIDER_RESULT.feedback_draft,
    model_name: 'qwen3-vl:2b',
    model_version: '1.0',
    provider: 'ollama',
    prompt_version: 'handwriting-v1',
    latency_ms: 0,
    reference_transcription: 'Bản chép từ bài mẫu.',
    student_transcription: 'Bản chép từ bài nộp.',
    uncertain_content: [],
    checker_status: 'PASSED',
    checker_summary: CHECKER_RESULT.summary,
    checker_findings: [],
    checker_prompt_version: 'handwriting-checker-v2',
  })
  assert.equal(context.adminClient.calls.some((call) => call.table === 'teacher_reviews'), false)
  assert.equal(JSON.stringify(context.adminClient.calls).includes('FINALIZED'), true)
  assert.equal(context.adminClient.calls.some((call) => call.value?.status === 'FINALIZED'), false)
})

test('runEvaluation emits verified progress stages in order', async () => {
  const progress = []
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(), error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
    provider: {
      async evaluate(_input, { onProgress }) {
        await onProgress('transcribed')
        await onProgress('evaluated')
        return {
          ...PROVIDER_RESULT,
          missing_content: [...PROVIDER_RESULT.missing_content],
          uncertain_content: [],
        }
      },
      async check() {
        return { ...CHECKER_RESULT, findings: [] }
      },
    },
  })

  await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
    { onProgress: (event) => progress.push(event) },
  )

  assert.deepEqual(progress, [
    { stage: 'input_ready', submissionId: submissionIds[0] },
    { stage: 'transcribed', submissionId: submissionIds[0] },
    { stage: 'evaluated', submissionId: submissionIds[0] },
    { stage: 'checked', submissionId: submissionIds[0] },
    { stage: 'persisted', submissionId: submissionIds[0] },
  ])
  assert.equal(progress.every((event) => Object.keys(event).length === 2), true)
})

test('progress callback failure does not fail evaluation', async () => {
  let callbackCalls = 0
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(), error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
  })

  const result = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
    {
      onProgress() {
        callbackCalls += 1
        throw new Error('client disconnected')
      },
    },
  )

  assert.equal(result.submission_status, 'REQUIRES_REVIEW')
  assert.equal(result.evaluation.id, evaluation().id)
  assert.equal(callbackCalls > 0, true)
})

test('AI usage recorder receives one entry for each model interaction', async () => {
  const recorded = []
  const context = buildService({
    usageRecorder: {
      async record(value) { recorded.push(value) },
    },
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(), error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
  })

  await context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0])

  assert.equal(recorded.length, 1)
  assert.equal(recorded[0].submissionId, submissionIds[0])
  assert.equal(recorded[0].evaluationId, evaluation().id)
  assert.deepEqual(recorded[0].interactions.map((item) => item.stage), [
    'evaluation',
    'checker',
  ])
})

test('usage logging failure does not fail a completed evaluation', async () => {
  const logger = { entries: [], error(entry) { this.entries.push(entry) } }
  const context = buildService({
    logger,
    usageRecorder: {
      async record() { throw new Error('logging unavailable') },
    },
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(), error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
  })

  const result = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.equal(result.submission_status, 'REQUIRES_REVIEW')
  assert.deepEqual(logger.entries, [{
    event: 'ai_usage_log_failed',
    submissionId: submissionIds[0],
    errorCode: 'AI_USAGE_LOG_FAILED',
  }])
})

test('checker failure keeps evaluator suggestion and leaves checker unverified', async () => {
  const recorded = []
  const uncheckedEvaluation = {
    ...evaluation(),
    checker_status: null,
    checker_summary: null,
    checker_findings: [],
    checker_prompt_version: null,
  }
  const context = buildService({
    usageRecorder: {
      async record(value) { recorded.push(value) },
    },
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: uncheckedEvaluation, error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
    provider: {
      async evaluate(_input, { onInteraction }) {
        onInteraction({
          stage: 'evaluation',
          status: 'SUCCEEDED',
          provider: 'ollama',
          model_name: 'qwen3-vl:2b',
          prompt_version: 'handwriting-v1',
        })
        return {
          ...PROVIDER_RESULT,
          missing_content: [...PROVIDER_RESULT.missing_content],
          uncertain_content: [],
        }
      },
      async check(_result, { onInteraction }) {
        onInteraction({
          stage: 'checker',
          status: 'FAILED',
          provider: 'ollama',
          model_name: 'qwen3-vl:2b',
          prompt_version: 'handwriting-checker-v2',
          error_code: 'AI_PROVIDER_FAILED',
        })
        throw new AppError(502, 'AI_PROVIDER_FAILED', 'Checker unavailable')
      },
    },
  })

  const result = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.equal(result.submission_status, 'REQUIRES_REVIEW')
  assert.equal(result.evaluation.checker_status, null)
  assert.equal(result.evaluation.checker_summary, null)
  assert.deepEqual(result.evaluation.checker_findings, [])
  assert.equal(result.evaluation.checker_prompt_version, null)
  assert.deepEqual(
    context.adminClient.calls
      .filter((call) => call.table === 'submissions')
      .map((call) => call.value.status),
    ['PROCESSING', 'REQUIRES_REVIEW'],
  )
  assert.equal(context.adminClient.calls[1].value.checker_status, null)
  assert.equal(context.adminClient.calls[1].value.checker_summary, null)
  assert.deepEqual(context.adminClient.calls[1].value.checker_findings, [])
  assert.equal(context.adminClient.calls[1].value.checker_prompt_version, null)
  assert.deepEqual(recorded[0].interactions.map((item) => [item.stage, item.status]), [
    ['evaluation', 'SUCCEEDED'],
    ['checker', 'FAILED'],
  ])
})

test('existing evaluation is returned idempotently without creating a duplicate', async () => {
  const existing = {
    ...evaluation(),
    checker_status: null,
    checker_summary: null,
    checker_findings: [],
    checker_prompt_version: null,
  }
  let providerCalls = 0
  let usageCalls = 0
  const context = buildService({
    submissionStatuses: ['REQUIRES_REVIEW', 'REQUIRES_REVIEW'],
    userResults: [
      { data: existing, error: null },
      { data: existing, error: null },
    ],
    provider: {
      async evaluate() { providerCalls += 1 },
      async check() { providerCalls += 1 },
    },
    usageRecorder: {
      async record() { usageCalls += 1 },
    },
  })

  const first = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )
  const second = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.deepEqual(first, second)
  assert.equal(context.adminClient.calls.length, 0)
  assert.equal(context.supabase.calls.length, 2)
  assert.equal(first.evaluation.checker_status, null)
  assert.equal(providerCalls, 0)
  assert.equal(usageCalls, 0)
})

test('assignment threshold overrides the model status before evaluation is saved', async () => {
  const savedEvaluation = {
    ...evaluation(),
    coverage_score: 79,
    suggested_status: 'COMPLETED',
  }
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: savedEvaluation, error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
    provider: {
      async evaluate() {
        return {
          ...PROVIDER_RESULT,
          coverage_score: 79,
          suggested_status: 'COMPLETED',
          missing_content: [...PROVIDER_RESULT.missing_content],
          uncertain_content: [],
        }
      },
    },
  })

  const result = await context.service.runEvaluation(
    teacherAuth(context.supabase),
    submissionIds[0],
  )

  assert.equal(result.evaluation.coverage_score, 79)
  assert.equal(result.evaluation.suggested_status, 'NEEDS_COMPLETION')
  assert.equal(context.adminClient.calls[1].value.suggested_status, 'NEEDS_COMPLETION')
})

test('provider receives only the prepared image input, never auth or profile data', async () => {
  let receivedInput
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: evaluation(), error: null },
      { data: { id: submissionIds[0], status: 'REQUIRES_REVIEW' }, error: null },
    ],
    provider: {
      async evaluate(input) {
        receivedInput = input
        return {
          ...PROVIDER_RESULT,
          missing_content: [...PROVIDER_RESULT.missing_content],
          uncertain_content: [],
        }
      },
    },
  })

  await context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0])

  assert.equal(Object.hasOwn(receivedInput, 'auth'), false)
  assert.equal(Object.hasOwn(receivedInput, 'profile'), false)
  assert.equal(Object.hasOwn(receivedInput, 'student'), false)
  assert.equal(receivedInput.referenceImages[0].buffer instanceof Buffer, true)
})

test('provider failure restores a newly processing submission to SUBMITTED', async () => {
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: { id: submissionIds[0], status: 'SUBMITTED' }, error: null },
    ],
    provider: {
      async evaluate() {
        throw new AppError(502, 'AI_PROVIDER_FAILED', 'Dịch vụ AI tạm thời không thể xử lý ảnh.')
      },
    },
  })

  await assert.rejects(
    context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    (error) => error.code === 'AI_PROVIDER_FAILED',
  )
  assert.deepEqual(
    context.adminClient.calls.filter((call) => call.table === 'submissions').map((call) => call.value),
    [{ status: 'PROCESSING' }, { status: 'SUBMITTED' }],
  )
  assert.equal(context.adminClient.calls.some((call) => call.table === 'ai_evaluations'), false)
})

test('invalid provider output is rejected before evaluation persistence', async () => {
  const context = buildService({
    userResults: [{ data: null, error: null }],
    adminResults: [
      { data: { id: submissionIds[0], status: 'PROCESSING' }, error: null },
      { data: { id: submissionIds[0], status: 'SUBMITTED' }, error: null },
    ],
    provider: {
      async evaluate() {
        return { coverage_score: 101 }
      },
    },
  })

  await assert.rejects(
    context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    (error) => error.code === 'AI_PROVIDER_INVALID_RESPONSE',
  )
  assert.equal(context.adminClient.calls.some((call) => call.table === 'ai_evaluations'), false)
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
    context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    forbidden,
  )
  assert.deepEqual(context.events, ['authorize-submission'])
  assert.equal(context.supabase.calls.length, 0)
  assert.equal(context.adminClient.calls.length, 0)
})

test('service rejects a Student before authorization or persistence', async () => {
  const context = buildService()

  await assert.rejects(
    context.service.runEvaluation(
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
      context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
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
    await context.service.runEvaluation(teacherAuth(context.supabase), submissionId)
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
    context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
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
    context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
    (error) => error.code === 'AI_EVALUATION_ROLLBACK_FAILED',
  )
  assert.deepEqual(logger.entries, [{
    event: 'ai_evaluation_status_recovery_failed',
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
    context.service.runEvaluation(teacherAuth(context.supabase), submissionIds[0]),
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
