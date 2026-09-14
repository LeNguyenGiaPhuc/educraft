import assert from 'node:assert/strict'
import test from 'node:test'

import { createSubmissionService } from '../src/modules/submissions/submissionService.js'

const teacherId = '22222222-2222-4222-8222-222222222222'
const submissionIds = [
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
]

function finalizedReview(overrides = {}) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    submission_id: submissionIds[0],
    teacher_id: teacherId,
    final_status: 'COMPLETED',
    final_score: 92,
    feedback: 'Bài ghi đạt yêu cầu.',
    is_finalized: true,
    finalized_at: '2026-09-14T04:00:00Z',
    ...overrides,
  }
}

function createSupabase(results = []) {
  const queue = [...results]
  return {
    calls: [],
    async rpc(name, input) {
      this.calls.push({ name, input })
      return queue.shift()
    },
  }
}

function teacherAuth(supabase, overrides = {}) {
  return {
    profile: { id: teacherId, role: 'TEACHER', ...overrides },
    supabase,
  }
}

function createService() {
  return createSubmissionService({
    adminClient: {},
    assignmentService: {},
    storageService: {},
    logger: { error() {} },
  })
}

test('assigned Teacher finalizes through one identity-free transactional RPC call', async () => {
  const review = finalizedReview()
  const supabase = createSupabase([{ data: review, error: null }])
  const input = {
    final_status: 'COMPLETED',
    final_score: 92,
    feedback: 'Bài ghi đạt yêu cầu.',
  }

  const result = await createService().finalizeSubmission(
    teacherAuth(supabase),
    submissionIds[0],
    input,
  )

  assert.deepEqual(supabase.calls, [{
    name: 'finalize_submission_review',
    input: {
      target_submission_id: submissionIds[0],
      target_final_status: 'COMPLETED',
      target_final_score: 92,
      target_feedback: 'Bài ghi đạt yêu cầu.',
    },
  }])
  assert.deepEqual(result, {
    submission_id: submissionIds[0],
    submission_status: 'FINALIZED',
    teacher_review: {
      id: review.id,
      final_status: 'COMPLETED',
      final_score: 92,
      feedback: 'Bài ghi đạt yêu cầu.',
      is_finalized: true,
      finalized_at: review.finalized_at,
    },
  })
  assert.equal(JSON.stringify(supabase.calls).includes('teacherId'), false)
  assert.equal(JSON.stringify(supabase.calls).includes('teacher_id'), false)
})

test('optional score is sent as null and the Teacher decision is independent from AI', async () => {
  const review = finalizedReview({
    final_status: 'NEEDS_COMPLETION',
    final_score: null,
    feedback: 'Cần bổ sung kết luận.',
  })
  const supabase = createSupabase([{ data: [review], error: null }])

  const result = await createService().finalizeSubmission(
    teacherAuth(supabase),
    submissionIds[0],
    {
      final_status: 'NEEDS_COMPLETION',
      feedback: 'Cần bổ sung kết luận.',
    },
  )

  assert.equal(supabase.calls[0].input.target_final_score, null)
  assert.equal(result.teacher_review.final_status, 'NEEDS_COMPLETION')
  assert.equal(result.teacher_review.final_score, null)
  assert.equal(JSON.stringify(supabase.calls).includes('suggested_status'), false)
  assert.equal(JSON.stringify(supabase.calls).includes('ai_evaluations'), false)
})

test('selected attempt ID is the only submission identifier sent for finalization', async () => {
  const selectedReview = finalizedReview({ submission_id: submissionIds[1] })
  const supabase = createSupabase([{ data: selectedReview, error: null }])

  await createService().finalizeSubmission(
    teacherAuth(supabase),
    submissionIds[1],
    {
      final_status: 'COMPLETED',
      final_score: 92,
      feedback: 'Bài ghi đạt yêu cầu.',
    },
  )

  assert.equal(supabase.calls[0].input.target_submission_id, submissionIds[1])
  assert.equal(JSON.stringify(supabase.calls).includes(submissionIds[0]), false)
})

test('RPC authorization and re-finalization failures map to safe business errors', async (context) => {
  const cases = [
    ['REVIEW_ROLE_FORBIDDEN', 403, 'FORBIDDEN'],
    ['SUBMISSION_NOT_FOUND', 404, 'SUBMISSION_NOT_FOUND'],
    ['CLASS_FORBIDDEN', 403, 'CLASS_FORBIDDEN'],
    ['SUBMISSION_ALREADY_FINALIZED', 409, 'SUBMISSION_ALREADY_FINALIZED'],
    ['REVIEW_ALREADY_FINALIZED', 409, 'SUBMISSION_ALREADY_FINALIZED'],
  ]

  for (const [message, status, code] of cases) {
    await context.test(message, async () => {
      const supabase = createSupabase([{
        data: null,
        error: { code: 'P0001', message },
      }])

      await assert.rejects(
        createService().finalizeSubmission(
          teacherAuth(supabase),
          submissionIds[0],
          {
            final_status: 'COMPLETED',
            feedback: 'Kết quả cuối.',
          },
        ),
        (error) => error.status === status && error.code === code,
      )
    })
  }
})

test('service rejects the wrong role before invoking the finalization RPC', async () => {
  const supabase = createSupabase()

  await assert.rejects(
    createService().finalizeSubmission(
      teacherAuth(supabase, { role: 'STUDENT' }),
      submissionIds[0],
      { final_status: 'COMPLETED', feedback: 'Kết quả cuối.' },
    ),
    (error) => error.status === 403 && error.code === 'FORBIDDEN',
  )
  assert.equal(supabase.calls.length, 0)
})

test('unknown and thrown RPC failures never expose database details', async () => {
  const returnedFailure = createSupabase([{
    data: null,
    error: { code: 'XX000', message: 'private database detail' },
  }])
  await assert.rejects(
    createService().finalizeSubmission(
      teacherAuth(returnedFailure),
      submissionIds[0],
      { final_status: 'COMPLETED', feedback: 'Kết quả cuối.' },
    ),
    (error) => error.code === 'FINALIZATION_FAILED'
      && !error.message.includes('private'),
  )

  const thrownFailure = createSupabase()
  thrownFailure.rpc = async () => { throw new Error('transport secret') }
  await assert.rejects(
    createService().finalizeSubmission(
      teacherAuth(thrownFailure),
      submissionIds[0],
      { final_status: 'COMPLETED', feedback: 'Kết quả cuối.' },
    ),
    (error) => error.code === 'FINALIZATION_FAILED'
      && !error.message.includes('secret'),
  )
})

test('invalid RPC result cannot be presented as a finalized result', async () => {
  const supabase = createSupabase([{
    data: finalizedReview({ teacher_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    error: null,
  }])

  await assert.rejects(
    createService().finalizeSubmission(
      teacherAuth(supabase),
      submissionIds[0],
      {
        final_status: 'COMPLETED',
        final_score: 92,
        feedback: 'Bài ghi đạt yêu cầu.',
      },
    ),
    (error) => error.code === 'INVALID_FINALIZATION_RESULT',
  )
})
