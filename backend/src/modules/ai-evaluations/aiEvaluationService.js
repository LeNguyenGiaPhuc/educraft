import { AppError } from '../../common/errors.js'

const AI_EVALUATION_COLUMNS = [
  'id',
  'submission_id',
  'coverage_score',
  'confidence',
  'suggested_status',
  'missing_content',
  'feedback_draft',
  'model_name',
  'model_version',
  'created_at',
].join(',')

export const MOCK_AI_EVALUATION = Object.freeze({
  coverage_score: 82,
  confidence: 0.84,
  suggested_status: 'REQUIRES_TEACHER_REVIEW',
  missing_content: Object.freeze(['Bổ sung phần kết luận.']),
  feedback_draft: 'Đánh giá mô phỏng: bài ghi đủ ý chính, cần giáo viên xem lại phần kết luận.',
  model_name: 'educraft-mock-evaluator',
  model_version: '1.0',
})

function requireTeacherContext(auth) {
  if (
    auth?.profile?.role !== 'TEACHER'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem đánh giá AI.')
  }

  return { supabase: auth.supabase }
}

function safeDatabaseError(code, message) {
  return new AppError(500, code, message)
}

function projectEvaluation(evaluation) {
  return {
    id: evaluation.id,
    submission_id: evaluation.submission_id,
    coverage_score: evaluation.coverage_score,
    confidence: evaluation.confidence,
    suggested_status: evaluation.suggested_status,
    missing_content: evaluation.missing_content,
    feedback_draft: evaluation.feedback_draft,
    model_name: evaluation.model_name,
    model_version: evaluation.model_version,
    created_at: evaluation.created_at,
  }
}

function mockEvaluationFor(submissionId) {
  return {
    submission_id: submissionId,
    coverage_score: MOCK_AI_EVALUATION.coverage_score,
    confidence: MOCK_AI_EVALUATION.confidence,
    suggested_status: MOCK_AI_EVALUATION.suggested_status,
    missing_content: [...MOCK_AI_EVALUATION.missing_content],
    feedback_draft: MOCK_AI_EVALUATION.feedback_draft,
    model_name: MOCK_AI_EVALUATION.model_name,
    model_version: MOCK_AI_EVALUATION.model_version,
  }
}

export function createAiEvaluationService({
  adminClient,
  submissionService,
  logger = console,
}) {
  async function authorizeTeacher(auth, submissionId) {
    requireTeacherContext(auth)
    return submissionService.getSubmission(auth, submissionId)
  }

  async function readEvaluation(supabase, submissionId) {
    let result
    try {
      result = await supabase
        .from('ai_evaluations')
        .select(AI_EVALUATION_COLUMNS)
        .eq('submission_id', submissionId)
        .maybeSingle()
    } catch {
      throw safeDatabaseError(
        'AI_EVALUATION_READ_FAILED',
        'Không thể đọc đề xuất đánh giá mô phỏng.',
      )
    }

    if (result.error) {
      throw safeDatabaseError(
        'AI_EVALUATION_READ_FAILED',
        'Không thể đọc đề xuất đánh giá mô phỏng.',
      )
    }

    return result.data
  }

  async function updateSubmissionStatus(submissionId, currentStatus, nextStatus) {
    let result
    try {
      result = await adminClient
        .from('submissions')
        .update({ status: nextStatus })
        .eq('id', submissionId)
        .eq('status', currentStatus)
        .neq('status', 'FINALIZED')
        .select('id,status')
        .maybeSingle()
    } catch {
      throw safeDatabaseError(
        'AI_STATUS_UPDATE_FAILED',
        'Không thể cập nhật trạng thái xử lý mô phỏng.',
      )
    }

    if (result.error) {
      throw safeDatabaseError(
        'AI_STATUS_UPDATE_FAILED',
        'Không thể cập nhật trạng thái xử lý mô phỏng.',
      )
    }
    if (!result.data) {
      throw new AppError(
        409,
        'SUBMISSION_STATE_CHANGED',
        'Trạng thái lượt nộp bài đã thay đổi. Vui lòng tải lại.',
      )
    }

    return result.data
  }

  async function persistMockEvaluation(submissionId) {
    let result
    try {
      result = await adminClient
        .from('ai_evaluations')
        .upsert(mockEvaluationFor(submissionId), { onConflict: 'submission_id' })
        .select(AI_EVALUATION_COLUMNS)
        .single()
    } catch {
      throw safeDatabaseError(
        'AI_EVALUATION_SAVE_FAILED',
        'Không thể lưu đề xuất đánh giá mô phỏng.',
      )
    }

    if (result.error || !result.data) {
      throw safeDatabaseError(
        'AI_EVALUATION_SAVE_FAILED',
        'Không thể lưu đề xuất đánh giá mô phỏng.',
      )
    }

    return projectEvaluation(result.data)
  }

  async function recoverSubmittedStatus(submissionId) {
    try {
      await updateSubmissionStatus(submissionId, 'PROCESSING', 'SUBMITTED')
    } catch (error) {
      logger.error({
        event: 'mock_ai_status_recovery_failed',
        submissionId,
        errorCode: error?.code ?? 'UNKNOWN_RECOVERY_ERROR',
      })
      throw new AppError(
        500,
        'AI_EVALUATION_ROLLBACK_FAILED',
        'Không thể khôi phục trạng thái sau khi đánh giá mô phỏng thất bại.',
      )
    }
  }

  return {
    async runMockEvaluation(auth, submissionId) {
      const { supabase } = requireTeacherContext(auth)
      const submission = await authorizeTeacher(auth, submissionId)

      if (submission.status === 'FINALIZED') {
        throw new AppError(
          409,
          'SUBMISSION_FINALIZED',
          'Lượt nộp bài đã được giáo viên chốt kết quả.',
        )
      }
      if (!['SUBMITTED', 'PROCESSING', 'REQUIRES_REVIEW'].includes(submission.status)) {
        throw new AppError(
          409,
          'AI_EVALUATION_STATE_INVALID',
          'Trạng thái lượt nộp bài không cho phép đánh giá mô phỏng.',
        )
      }

      const existingEvaluation = await readEvaluation(supabase, submissionId)
      if (existingEvaluation) {
        if (submission.status !== 'REQUIRES_REVIEW') {
          await updateSubmissionStatus(
            submissionId,
            submission.status,
            'REQUIRES_REVIEW',
          )
        }

        return {
          submission_id: submissionId,
          submission_status: 'REQUIRES_REVIEW',
          evaluation: projectEvaluation(existingEvaluation),
        }
      }

      if (submission.status === 'REQUIRES_REVIEW') {
        throw new AppError(
          409,
          'AI_EVALUATION_MISSING',
          'Lượt nộp bài đang chờ duyệt nhưng chưa có đề xuất đánh giá.',
        )
      }

      if (submission.status === 'SUBMITTED') {
        await updateSubmissionStatus(submissionId, 'SUBMITTED', 'PROCESSING')
      }

      let evaluation
      try {
        evaluation = await persistMockEvaluation(submissionId)
      } catch (error) {
        if (submission.status === 'SUBMITTED') {
          await recoverSubmittedStatus(submissionId)
        }
        throw error
      }

      await updateSubmissionStatus(submissionId, 'PROCESSING', 'REQUIRES_REVIEW')

      return {
        submission_id: submissionId,
        submission_status: 'REQUIRES_REVIEW',
        evaluation,
      }
    },

    async getEvaluation(auth, submissionId) {
      const { supabase } = requireTeacherContext(auth)
      await authorizeTeacher(auth, submissionId)
      const evaluation = await readEvaluation(supabase, submissionId)

      if (!evaluation) {
        throw new AppError(
          404,
          'AI_EVALUATION_NOT_FOUND',
          'Chưa có đề xuất đánh giá mô phỏng cho lượt nộp bài này.',
        )
      }

      return projectEvaluation(evaluation)
    },
  }
}
