import { AppError } from '../../common/errors.js'
import { parseProviderResult } from './aiEvaluationSchema.js'

const AI_EVALUATION_COLUMNS = [
  'id',
  'submission_id',
  'coverage_score',
  'confidence',
  'suggested_status',
  'missing_content',
  'feedback_draft',
  'provider',
  'prompt_version',
  'latency_ms',
  'reference_transcription',
  'student_transcription',
  'uncertain_content',
  'model_name',
  'model_version',
  'created_at',
].join(',')

const EVALUATABLE_STATUSES = new Set(['SUBMITTED', 'PROCESSING', 'REQUIRES_REVIEW'])

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
    missing_content: evaluation.missing_content ?? [],
    feedback_draft: evaluation.feedback_draft,
    provider: evaluation.provider ?? null,
    prompt_version: evaluation.prompt_version ?? null,
    latency_ms: evaluation.latency_ms ?? null,
    reference_transcription: evaluation.reference_transcription ?? null,
    student_transcription: evaluation.student_transcription ?? null,
    uncertain_content: evaluation.uncertain_content ?? [],
    model_name: evaluation.model_name,
    model_version: evaluation.model_version,
    created_at: evaluation.created_at,
  }
}

export function createAiEvaluationService({
  adminClient,
  submissionService,
  inputService,
  provider,
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
        'Không thể đọc đề xuất đánh giá.',
      )
    }

    if (result.error) {
      throw safeDatabaseError(
        'AI_EVALUATION_READ_FAILED',
        'Không thể đọc đề xuất đánh giá.',
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
        'Không thể cập nhật trạng thái đánh giá.',
      )
    }

    if (result.error) {
      throw safeDatabaseError(
        'AI_STATUS_UPDATE_FAILED',
        'Không thể cập nhật trạng thái đánh giá.',
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

  async function persistEvaluation(submissionId, providerResult) {
    const normalized = parseProviderResult(providerResult)
    const value = {
      submission_id: submissionId,
      ...normalized,
    }

    let result
    try {
      result = await adminClient
        .from('ai_evaluations')
        .upsert(value, { onConflict: 'submission_id' })
        .select(AI_EVALUATION_COLUMNS)
        .single()
    } catch {
      throw safeDatabaseError(
        'AI_EVALUATION_SAVE_FAILED',
        'Không thể lưu đề xuất đánh giá.',
      )
    }

    if (result.error || !result.data) {
      throw safeDatabaseError(
        'AI_EVALUATION_SAVE_FAILED',
        'Không thể lưu đề xuất đánh giá.',
      )
    }

    return projectEvaluation(result.data)
  }

  async function recoverSubmittedStatus(submissionId) {
    try {
      await updateSubmissionStatus(submissionId, 'PROCESSING', 'SUBMITTED')
    } catch (error) {
      logger.error({
        event: 'ai_evaluation_status_recovery_failed',
        submissionId,
        errorCode: error?.code ?? 'UNKNOWN_RECOVERY_ERROR',
      })
      throw new AppError(
        500,
        'AI_EVALUATION_ROLLBACK_FAILED',
        'Không thể khôi phục trạng thái sau khi đánh giá thất bại.',
      )
    }
  }

  return {
    async runEvaluation(auth, submissionId) {
      const { supabase } = requireTeacherContext(auth)
      const submission = await authorizeTeacher(auth, submissionId)

      if (submission.status === 'FINALIZED') {
        throw new AppError(
          409,
          'SUBMISSION_FINALIZED',
          'Lượt nộp bài đã được giáo viên chốt kết quả.',
        )
      }
      if (!EVALUATABLE_STATUSES.has(submission.status)) {
        throw new AppError(
          409,
          'AI_EVALUATION_STATE_INVALID',
          'Trạng thái lượt nộp bài không cho phép đánh giá.',
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

      const input = await inputService.loadEvaluationInput(auth, submission)
      let transitionedToProcessing = false

      if (submission.status === 'SUBMITTED') {
        await updateSubmissionStatus(submissionId, 'SUBMITTED', 'PROCESSING')
        transitionedToProcessing = true
      }

      let evaluation
      try {
        const providerResult = await provider.evaluate(input)
        evaluation = await persistEvaluation(submissionId, providerResult)
      } catch (error) {
        if (transitionedToProcessing) {
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
          'Chưa có đề xuất đánh giá cho lượt nộp bài này.',
        )
      }

      return projectEvaluation(evaluation)
    },
  }
}
