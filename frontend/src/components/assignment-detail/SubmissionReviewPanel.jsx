import { useEffect, useState } from 'react'

import { formatSubmissionAttempt } from '../../data/teacherSubmissionView.js'
import { aiEvaluationService } from '../../services/aiEvaluationService.js'
import { submissionService } from '../../services/submissionService.js'
import AiResultCard from './AiResultCard.jsx'
import FieldError from './FieldError.jsx'
import {
  finalStatusForForm,
  formatSubmissionDate,
  mapEvaluation,
} from './assignmentDetailView.js'

function validateReviewForm(form) {
  const errors = {}
  if (!['COMPLETED', 'NEEDS_COMPLETION'].includes(form.finalStatus)) {
    errors.finalStatus = 'Chọn kết quả cuối cùng.'
  }
  if (!String(form.feedback ?? '').trim()) {
    errors.feedback = 'Nhập nhận xét cho học sinh.'
  }
  return errors
}

export default function SubmissionReviewPanel({ submission, onReviewed }) {
  const [evaluationState, setEvaluationState] = useState({ status: 'loading', data: null })
  const [form, setForm] = useState({
    finalStatus: finalStatusForForm(submission.finalStatus),
    feedback: submission.feedback ?? '',
  })
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState({ status: 'idle' })

  useEffect(() => {
    let isMounted = true

    aiEvaluationService.getEvaluation(submission.id)
      .then((result) => {
        if (!isMounted) return
        const evaluation = mapEvaluation(result)
        setEvaluationState({ status: 'success', data: evaluation })
        setForm((current) => ({
          finalStatus: finalStatusForForm(submission.finalStatus, evaluation.suggestedStatus),
          feedback: current.feedback || evaluation.feedbackDraft,
        }))
      })
      .catch((error) => {
        if (!isMounted) return
        if (error?.status === 404 || error?.code === 'AI_EVALUATION_NOT_FOUND') {
          setEvaluationState({ status: 'not-started', data: null })
          return
        }
        setEvaluationState({
          status: 'error',
          data: null,
          message: error?.message ?? 'Chưa có đề xuất AI cho bài nộp này.',
        })
      })

    return () => { isMounted = false }
  }, [submission.id, submission.finalStatus])

  const isFinalized = submission.status === 'approved'

  async function handleRunEvaluation() {
    if (evaluationState.status === 'loading' || isFinalized) return

    setEvaluationState({ status: 'loading', data: null })
    try {
      const result = await aiEvaluationService.createEvaluation(submission.id)
      const evaluation = mapEvaluation(result)
      setEvaluationState({ status: 'success', data: evaluation })
      setForm((current) => ({
        finalStatus: finalStatusForForm(submission.finalStatus, evaluation.suggestedStatus),
        feedback: current.feedback || evaluation.feedbackDraft,
      }))
    } catch (error) {
      setEvaluationState({
        status: 'error',
        data: null,
        message: error?.message ?? 'Không thể phân tích bài nộp lúc này. Vui lòng thử lại.',
      })
    }
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setReview((current) => (current.status === 'idle' ? current : { status: 'idle' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateReviewForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setReview({ status: 'loading' })
    try {
      const result = await submissionService.finalizeSubmission(submission.id, {
        final_status: form.finalStatus,
        feedback: form.feedback.trim(),
      })
      setReview({ status: 'success' })
      onReviewed(result)
    } catch (error) {
      setReview({
        status: 'error',
        message: error?.message ?? 'Không thể lưu kết quả chấm lúc này. Vui lòng thử lại.',
      })
    }
  }

  const evaluation = evaluationState.data ?? {
    suggestedStatus: 'REQUIRES_TEACHER_REVIEW',
    confidence: 0,
    strengths: ['Chưa có dữ liệu AI.'],
    weaknesses: ['Giáo viên tự xem bài và nhập nhận xét.'],
    feedbackDraft: '',
    provider: '',
    referenceTranscription: '',
    studentTranscription: '',
    uncertainContent: [],
  }

  return (
    <section className="submission-review-panel teacher-review-panel" aria-labelledby="review-title">
      <div className="submission-review-heading teacher-review-heading">
        <div>
          <p className="state-kicker">Duyệt bài nộp</p>
          <h3 id="review-title">{submission.studentName}</h3>
          <p>
            {[submission.studentCode, formatSubmissionAttempt(submission.attemptNumber)]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p>{submission.fileName} · Nộp lúc {formatSubmissionDate(submission.submittedAt)}</p>
          {submission.fileUrl && <a href={submission.fileUrl} target="_blank" rel="noreferrer">Xem ảnh bài nộp</a>}
        </div>
        <span className={`review-state teacher-review-state${isFinalized ? ' review-state-approved teacher-review-state-approved' : ''}`}>
          {isFinalized ? 'Đã chốt' : 'Chưa chốt'}
        </span>
      </div>

      {evaluationState.status === 'loading' && (
        <p className="form-field-help" aria-live="polite">Đang tải đề xuất AI...</p>
      )}
      {evaluationState.status === 'not-started' && (
        <div className="ai-consent-panel teacher-ai-consent">
          <p className="state-kicker">Phân tích tùy chọn</p>
          <h4>Phân tích bằng AI</h4>
          <p>
            Ảnh bài mẫu và bài nộp sẽ được gửi tới dịch vụ AI để tạo bản chép và gợi ý.
            Chỉ sử dụng dữ liệu phù hợp với chính sách bảo mật của nhà trường.
          </p>
          <button className="button button-primary" onClick={handleRunEvaluation} type="button">
            Phân tích bằng AI
          </button>
        </div>
      )}
      {evaluationState.status === 'error' && (
        <div className="ai-error-state teacher-ai-error">
          <div className="form-submit-message form-submit-error" role="alert">{evaluationState.message}</div>
          {!isFinalized && (
            <button className="button button-outline" onClick={handleRunEvaluation} type="button">
              Thử phân tích lại
            </button>
          )}
        </div>
      )}
      {evaluationState.status === 'success' && <AiResultCard evaluation={evaluation} />}

      <form className="review-form teacher-review-form" noValidate onSubmit={handleSubmit}>
        <div className="form-fields teacher-fields-grid">
          <div className="form-field form-field-narrow teacher-field teacher-field-narrow">
            <label htmlFor="review-final-status">Kết quả giáo viên chốt <span aria-hidden="true">*</span></label>
            <select
              aria-describedby={errors.finalStatus ? 'review-final-status-error' : undefined}
              aria-invalid={Boolean(errors.finalStatus)}
              disabled={isFinalized}
              id="review-final-status"
              name="finalStatus"
              onChange={handleChange}
              value={form.finalStatus}
            >
              <option value="COMPLETED">Completed</option>
              <option value="NEEDS_COMPLETION">Needs Completion</option>
            </select>
            <FieldError id="review-final-status-error" message={errors.finalStatus} />
          </div>

          <div className="form-field form-field-wide teacher-field teacher-field-wide">
            <label htmlFor="review-feedback">Nhận xét cuối <span aria-hidden="true">*</span></label>
            <textarea
              aria-describedby={errors.feedback ? 'review-feedback-error' : undefined}
              aria-invalid={Boolean(errors.feedback)}
              disabled={isFinalized}
              id="review-feedback"
              name="feedback"
              onChange={handleChange}
              rows="4"
              value={form.feedback}
            />
            <FieldError id="review-feedback-error" message={errors.feedback} />
          </div>
        </div>

        {review.status === 'error' && <div className="form-submit-message form-submit-error" role="alert">{review.message}</div>}
        {review.status === 'success' && <div className="form-submit-message form-submit-success" role="status">Đã chốt trạng thái và nhận xét cho học sinh.</div>}

        <div className="review-form-actions teacher-review-actions">
          <span>Kết quả cuối cùng do giáo viên quyết định.</span>
          <button
            aria-busy={review.status === 'loading'}
            className="button button-primary"
            disabled={isFinalized || review.status === 'loading'}
            type="submit"
          >
            {isFinalized ? 'Đã chốt' : review.status === 'loading' ? 'Đang lưu...' : 'Chốt kết quả'}
          </button>
        </div>
      </form>
    </section>
  )
}
