import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { formatSubmissionAttempt } from '../../data/teacherSubmissionView.js'
import { aiEvaluationService } from '../../services/aiEvaluationService.js'
import { submissionService } from '../../services/submissionService.js'
import AiResultCard from './AiResultCard.jsx'
import FieldError from './FieldError.jsx'
import { finalStatusLabel, formatSubmissionDate } from './assignmentDetailView.js'
import { createReviewSession } from './reviewSession.js'
import { animateTeacherDossier } from '../teacher/teacherMotion.js'
import '../../styles/teacher-review-workspace.css'

export default function SubmissionReviewPanel({ submission, onReviewed, assignmentId, coverageThreshold, reviewSession }) {
  const [ownSession] = useState(() => createReviewSession(assignmentId))
  const session = reviewSession ?? ownSession
  session.ensure(submission)
  const subscribe = useCallback((listener) => session.subscribe(submission.id, listener), [session, submission.id])
  const snapshot = useCallback(() => session.get(submission.id), [session, submission.id])
  const entry = useSyncExternalStore(subscribe, snapshot, snapshot)
  const mounted = useRef(false)
  const folioEdge = useRef(null)
  useEffect(() => {
    mounted.current = true
    session.syncSubmission(submission)
    session.loadEvaluation(submission.id, (id) => aiEvaluationService.getEvaluation(id))
    return () => { mounted.current = false }
  }, [session, submission])
  useEffect(() => animateTeacherDossier(folioEdge.current), [submission.id])
  const { form, errors, evaluation: evaluationState, review } = entry
  const isFinalized = entry.finalized || submission.status === 'approved'
  const locked = isFinalized || review.status === 'loading'
  const feedbackId = `review-feedback-${submission.id}`
  const statusId = `review-status-${submission.id}`
  function handleChange(event) {
    session.change(submission.id, event.target.name, event.target.value)
  }
  async function handleSubmit(event) {
    event.preventDefault()
    const result = await session.finalize(submission.id, (id, input) => submissionService.finalizeSubmission(id, input))
    if (result === undefined || !mounted.current) return
    try { await onReviewed?.(result) } catch { session.refreshFailed(submission.id) }
  }
  return (
    <section className="tk-review-workspace" aria-labelledby={`review-title-${submission.id}`}>
      <header className="tk-review-identity">
        <div>
          <h3 id={`review-title-${submission.id}`}>{submission.studentName}</h3>
          <p>{[submission.studentCode, formatSubmissionAttempt(submission.attemptNumber)].filter(Boolean).join(' · ')}</p>
          <p>{submission.fileName} · {formatSubmissionDate(submission.submittedAt)}</p>
          {submission.fileUrl && <a href={submission.fileUrl} target="_blank" rel="noreferrer">Mở ảnh bài nộp gốc</a>}
        </div>
        <span className="tk-review-state">{isFinalized ? 'Đã chốt' : 'Chưa chốt'}</span>
      </header>
      <section className="tk-insights" aria-label="Gợi ý AI">
        {['idle', 'loading'].includes(evaluationState.status) && <p className="tk-review-inline-state" role="status">{evaluationState.operation === 'analyze' ? 'AI đang phân tích bài nộp… Bạn vẫn có thể nhận xét thủ công.' : 'Đang đọc đề xuất AI đã lưu…'}</p>}
        {['not-started', 'empty'].includes(evaluationState.status) && (
          <div className="tk-ai-consent">
            <h4>{isFinalized ? 'Không có đề xuất AI đã lưu' : 'Phân tích AI — tùy chọn'}</h4>
            <p>{isFinalized ? 'Giữ nguyên kết quả đã được giáo viên chốt.' : 'Ảnh bài mẫu và bài nộp sẽ được gửi tới dịch vụ AI. Chỉ sử dụng dữ liệu phù hợp với chính sách bảo mật của nhà trường. Bạn có thể chốt thủ công mà không chạy AI.'}</p>
            {!isFinalized && <button className="tk-primary-action" type="button" onClick={() => session.runEvaluation(submission.id, (id) => aiEvaluationService.createEvaluation(id))}>Phân tích bằng AI</button>}
          </div>
        )}
        {evaluationState.status === 'error' && (
          <div className="tk-review-inline-state tk-review-error">
            <p role="alert">{evaluationState.message}</p>
            {!isFinalized && <button className="tk-secondary-action" type="button" onClick={() => session.runEvaluation(submission.id, (id) => aiEvaluationService.createEvaluation(id))}>Thử phân tích lại</button>}
          </div>
        )}
        {evaluationState.status === 'success' && <AiResultCard evaluation={evaluationState.data} coverageThreshold={coverageThreshold} />}
      </section>
      <section className="tk-teacher-folio" aria-labelledby={`folio-title-${submission.id}`}>
        <div className="tk-folio-edge" ref={folioEdge} aria-hidden="true" />
        <header className="tk-folio-heading">
          <h3 id={`folio-title-${submission.id}`}>Nhận xét của giáo viên</h3>
          {isFinalized && <span className={`tk-teacher-seal${review.status === 'success' ? ' tk-teacher-seal-confirmed' : ''}`} role="status">Giáo viên đã chốt · {finalStatusLabel(form.finalStatus)}</span>}
        </header>
        {isFinalized && entry.serverReview?.finalized_at && <p className="tk-folio-confirmed-time">Chốt lúc {formatSubmissionDate(entry.serverReview.finalized_at)}</p>}
        <form className="tk-review-form" noValidate onSubmit={handleSubmit}>
          <div className="tk-review-field">
            <label htmlFor={statusId}>Kết quả cuối cùng <span aria-hidden="true">*</span></label>
            <select id={statusId} name="finalStatus" onChange={handleChange} value={form.finalStatus} disabled={locked} aria-invalid={Boolean(errors.finalStatus)} aria-describedby={errors.finalStatus ? `${statusId}-error` : undefined}>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="NEEDS_COMPLETION">Cần bổ sung</option>
            </select>
            <FieldError id={`${statusId}-error`} message={errors.finalStatus} />
          </div>
          <div className="tk-review-field">
            <label htmlFor={feedbackId}>Nhận xét cuối cùng <span aria-hidden="true">*</span></label>
            <textarea id={feedbackId} name="feedback" onChange={handleChange} rows="7" value={form.feedback} disabled={locked} aria-invalid={Boolean(errors.feedback)} aria-describedby={errors.feedback ? `${feedbackId}-error` : undefined} />
            <FieldError id={`${feedbackId}-error`} message={errors.feedback} />
          </div>
          {review.status === 'error' && <p className="tk-review-error" role="alert">{review.message}</p>}
          {review.status === 'success' && <p className="tk-review-inline-state" role="status">Đã chốt trạng thái và nhận xét cho học sinh.</p>}
          {review.refreshWarning && <p className="tk-review-error" role="alert">{review.refreshWarning}</p>}
          <footer className="tk-folio-actions">
            <p>Kết quả cuối cùng do giáo viên quyết định. Gợi ý AI không thay thế nhận xét đã nhập.</p>
            <button className="tk-primary-action" type="submit" disabled={locked} aria-busy={review.status === 'loading'}>{isFinalized ? 'Đã chốt' : review.status === 'loading' ? 'Đang lưu…' : 'Chốt kết quả'}</button>
          </footer>
        </form>
      </section>
    </section>
  )
}
