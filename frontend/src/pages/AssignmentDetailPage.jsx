import { useEffect, useReducer, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import {
  formatAssignmentDeadline,
  toAssignmentUpdateDeadline,
  toTeacherDeadlineInput,
} from '../data/assignmentDeadline.js'
import {
  formatSubmissionAttempt,
  mapTeacherSubmission,
  selectTeacherSubmission,
} from '../data/teacherSubmissionView.js'
import {
  createReferenceEditorState,
  referenceEditorReducer,
} from '../data/referenceEditorState.js'
import PageErrorState from '../components/PageErrorState.jsx'
import { aiEvaluationService } from '../services/aiEvaluationService.js'
import { assignmentService } from '../services/assignmentService.js'
import { referenceService } from '../services/referenceService.js'
import { submissionService } from '../services/submissionService.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const submissionDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function formatSubmissionDate(value) {
  if (!value) return 'Chưa có thời gian'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Chưa có thời gian'

  return submissionDateFormatter.format(date)
}

function mapAssignment(assignment = {}, classroom) {
  const statusLabels = {
    OPEN: { label: 'Đang mở', tone: 'active' },
    CLOSED: { label: 'Đã đóng', tone: 'closed' },
    DRAFT: { label: 'Bản nháp', tone: 'warning' },
  }
  const status = statusLabels[assignment.status] ?? statusLabels.DRAFT

  return {
    id: assignment.id,
    classId: assignment.class_id,
    title: assignment.title ?? 'Chưa có tên',
    dueAt: assignment.due_at,
    dueDate: formatAssignmentDeadline({ dueAt: assignment.due_at }),
    threshold: `${Number(assignment.coverage_threshold ?? 0)}%`,
    coverageThreshold: Number(assignment.coverage_threshold ?? 0),
    status: assignment.status ?? 'DRAFT',
    statusLabel: status.label,
    statusTone: status.tone,
    classroom,
  }
}

function mapReference(reference = {}) {
  return {
    id: reference.id,
    fileName: reference.original_filename ?? 'Bài mẫu',
    uploadedAt: reference.created_at,
    url: reference.signed_url ?? '',
  }
}

function mapEvaluation(result = {}) {
  const evaluation = result.evaluation ?? result
  const missingContent = Array.isArray(evaluation.missing_content)
    ? evaluation.missing_content
    : []

  return {
    suggestedStatus: evaluation.suggested_status ?? 'REQUIRES_TEACHER_REVIEW',
    confidence: Number(evaluation.confidence ?? 0),
    strengths: Number.isFinite(Number(evaluation.coverage_score))
      ? [`Độ bao phủ nội dung: ${evaluation.coverage_score}%`]
      : ['Chưa có dữ liệu điểm bao phủ.'],
    weaknesses: missingContent.length > 0 ? missingContent : ['Không có nội dung thiếu được ghi nhận.'],
    feedbackDraft: evaluation.feedback_draft ?? '',
  }
}

function finalStatusLabel(status) {
  const labels = {
    COMPLETED: 'Completed',
    NEEDS_COMPLETION: 'Needs Completion',
    REQUIRES_TEACHER_REVIEW: 'Requires Teacher Review',
  }
  return labels[status] ?? 'Chưa chốt'
}

function finalStatusForForm(status, suggestedStatus) {
  if (status === 'COMPLETED' || status === 'NEEDS_COMPLETION') return status
  return suggestedStatus === 'COMPLETED' ? 'COMPLETED' : 'NEEDS_COMPLETION'
}

function FieldError({ id, message }) {
  if (!message) return null
  return <p className="form-field-error" id={id} role="alert">{message}</p>
}

function AssignmentDetailError({ message }) {
  return (
    <PageErrorState
      kicker="Chi tiết bài kiểm tra"
      message={message}
      title="Không thể mở bài kiểm tra"
    />
  )
}

function validateReferenceFile(file) {
  if (!file) return 'Chọn bài mẫu của giáo viên để tải lên.'
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) return 'Chỉ nhận file JPG, JPEG, PNG hoặc WebP cho bài mẫu.'
  if (!Number.isFinite(file.size) || file.size <= 0) return 'File bài mẫu không hợp lệ.'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'Kích thước bài mẫu không được vượt quá 5 MB.'
  return ''
}

export function ReferenceFeedback({ state, successMessage }) {
  if (state.status === 'error') {
    return <div className="form-submit-message form-submit-error" role="alert">{state.message}</div>
  }
  if (state.status === 'success') {
    return <div className="form-submit-message form-submit-success" role="status">{successMessage}</div>
  }
  return null
}

export function ReferenceEditor({ editor, onCancel, onFileChange, onSubmit }) {
  const inputId = editor.mode === 'add'
    ? 'reference-file-add'
    : `reference-file-${editor.referenceId}`
  const helpId = `${inputId}-help`
  const errorId = `${inputId}-error`
  const isAdd = editor.mode === 'add'

  return (
    <form className="reference-form reference-inline-form" noValidate onSubmit={onSubmit}>
      <div className="form-field">
        <label htmlFor={inputId}>
          {isAdd ? 'Chọn bài mẫu mới' : 'Chọn file thay thế'} <span aria-hidden="true">*</span>
        </label>
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-describedby={editor.error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={Boolean(editor.error)}
          id={inputId}
          onChange={onFileChange}
          type="file"
        />
        <p className="form-field-help" id={helpId}>JPG, JPEG, PNG hoặc WebP, tối đa 5 MB.</p>
        {editor.file && <p className="form-field-help">Đã chọn: {editor.file.name}</p>}
        <FieldError id={errorId} message={editor.error} />
      </div>

      <ReferenceFeedback
        state={editor}
        successMessage={isAdd ? 'Đã thêm bài mẫu.' : 'Đã thay bài mẫu.'}
      />

      <div className="assignment-form-actions">
        <button
          className="button button-outline"
          disabled={editor.status === 'loading'}
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
        <button
          aria-busy={editor.status === 'loading'}
          className="button button-primary"
          disabled={editor.status === 'loading'}
          type="submit"
        >
          {editor.status === 'loading'
            ? 'Đang lưu...'
            : isAdd ? 'Thêm bài mẫu' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}

export function ReferenceCard({ assignment, references = [], onChanged }) {
  const [editor, dispatchEditor] = useReducer(
    referenceEditorReducer,
    undefined,
    createReferenceEditorState,
  )
  const [deleteState, setDeleteState] = useState({ status: 'idle', referenceId: null })

  function handleFileChange(event) {
    dispatchEditor({ type: 'SELECT_FILE', file: event.target.files?.[0] ?? null })
  }

  async function handleSave(event) {
    event.preventDefault()
    const validationError = validateReferenceFile(editor.file)
    if (validationError) {
      dispatchEditor({ type: 'VALIDATION_ERROR', message: validationError })
      return
    }

    dispatchEditor({ type: 'REQUEST_START' })
    try {
      if (editor.mode === 'replace') {
        await referenceService.replaceReference(
          assignment.id,
          editor.referenceId,
          editor.file,
          editor.file.name,
        )
      } else {
        await referenceService.uploadReference(assignment.id, editor.file, editor.file.name)
      }
      dispatchEditor({ type: 'REQUEST_SUCCESS' })
      onChanged()
    } catch (requestError) {
      dispatchEditor({
        type: 'REQUEST_ERROR',
        message: requestError?.message ?? (editor.mode === 'replace'
          ? 'Không thể thay bài mẫu lúc này. Vui lòng thử lại.'
          : 'Không thể thêm bài mẫu lúc này. Vui lòng thử lại.'),
      })
    }
  }

  async function handleDelete(referenceId) {
    if (typeof window !== 'undefined' && !window.confirm('Bạn có chắc muốn xóa bài mẫu này không?')) return

    setDeleteState({ status: 'loading', referenceId })
    try {
      await referenceService.deleteReference(assignment.id, referenceId)
      setDeleteState({ status: 'idle', referenceId: null })
      if (editor.referenceId === referenceId) dispatchEditor({ type: 'CLOSE' })
      onChanged()
    } catch (requestError) {
      setDeleteState({
        status: 'error',
        referenceId,
        message: requestError?.message ?? 'Không thể xóa bài mẫu lúc này. Vui lòng thử lại.',
      })
    }
  }

  return (
    <section className="assignment-detail-card" aria-labelledby="reference-title">
      <div className="assignment-detail-card-heading">
        <div>
          <p className="state-kicker">Tài liệu đối chiếu</p>
          <h2 id="reference-title">Bài mẫu của giáo viên</h2>
        </div>
        <span className="detail-card-label">{references.length} bài mẫu</span>
      </div>

      <p className="assignment-detail-card-description">
        Upload ảnh bài ghi mẫu để làm tài liệu tham chiếu khi AI phân tích và giáo viên chấm duyệt.
      </p>

      {references.length === 0 ? (
        <div className="reference-empty">Chưa có bài mẫu cho bài kiểm tra này.</div>
      ) : (
        <div className="reference-list">
          {references.map((reference) => (
            <div className="reference-entry" key={reference.id}>
              <div className="reference-file">
                <div className="reference-file-details">
                  <strong title={reference.fileName}>{reference.fileName}</strong>
                  <span>Tạo lúc {formatSubmissionDate(reference.uploadedAt)}</span>
                  {reference.url && (
                    <a href={reference.url} target="_blank" rel="noreferrer">Xem bài mẫu</a>
                  )}
                </div>
                <div className="reference-actions">
                  <button
                    aria-label="Thay bài mẫu"
                    className="icon-button reference-action-button"
                    disabled={deleteState.status === 'loading'}
                    onClick={() => dispatchEditor({
                      type: 'OPEN_REPLACE',
                      referenceId: reference.id,
                    })}
                    title="Thay bài mẫu"
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                      <path d="m13.5 6.5 4 4" />
                    </svg>
                  </button>
                  <button
                    aria-label="Xóa bài mẫu"
                    className="icon-button reference-action-button reference-action-delete"
                    disabled={deleteState.status === 'loading'}
                    onClick={() => handleDelete(reference.id)}
                    title="Xóa bài mẫu"
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M4 7h16" />
                      <path d="M9 7V4h6v3" />
                      <path d="m6 7 1 13h10l1-13" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>
                  </button>
                </div>
              </div>
              {editor.mode === 'replace' && editor.referenceId === reference.id && (
                <ReferenceEditor
                  editor={editor}
                  onCancel={() => dispatchEditor({ type: 'CLOSE' })}
                  onFileChange={handleFileChange}
                  onSubmit={handleSave}
                />
              )}
              {deleteState.status === 'error' && deleteState.referenceId === reference.id && (
                <ReferenceFeedback state={deleteState} successMessage="" />
              )}
            </div>
          ))}
        </div>
      )}

      {editor.mode === 'add' ? (
        <ReferenceEditor
          editor={editor}
          onCancel={() => dispatchEditor({ type: 'CLOSE' })}
          onFileChange={handleFileChange}
          onSubmit={handleSave}
        />
      ) : (
        <button
          className="button button-outline reference-add-button"
          onClick={() => dispatchEditor({ type: 'OPEN_ADD' })}
          type="button"
        >
          + Thêm bài mẫu
        </button>
      )}
    </section>
  )
}

function submissionStatusLabel(submission) {
  if (submission.status === 'approved') {
    return `Đã chốt · ${finalStatusLabel(submission.finalStatus)}`
  }
  return 'Chờ giáo viên chốt'
}

export function SubmissionList({ submissions, selectedId, onSelect }) {
  if (submissions.length === 0) {
    return <div className="table-empty assignment-submissions-empty">Chưa có bài nộp nào.</div>
  }

  return (
    <div className="submission-list" aria-label="Danh sách bài nộp của học sinh">
      {submissions.map((submission) => (
        <button
          aria-pressed={selectedId === submission.id}
          className={`submission-list-item${selectedId === submission.id ? ' submission-list-item-active' : ''}`}
          key={submission.id}
          onClick={() => onSelect(submission.id)}
          type="button"
        >
          <span className="submission-student-mark" aria-hidden="true">
            {(submission.studentCode || submission.studentName).slice(-2)}
          </span>
          <span className="submission-list-main">
            <strong>{submission.studentName}</strong>
            <span>
              {[submission.studentCode, formatSubmissionAttempt(submission.attemptNumber)]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <span>{submission.fileName} · {formatSubmissionDate(submission.submittedAt)}</span>
          </span>
          <span className={`submission-list-status${submission.status === 'approved' ? ' submission-list-status-approved' : ''}`}>
            {submissionStatusLabel(submission)}
          </span>
        </button>
      ))}
    </div>
  )
}

function AiResultCard({ evaluation }) {
  return (
    <section className="ai-result-card" aria-labelledby="ai-result-title">
      <div className="ai-result-heading">
        <div>
          <p className="state-kicker">Kết quả mô phỏng</p>
          <h3 id="ai-result-title">AI đề xuất</h3>
        </div>
        <strong>{Math.round(evaluation.confidence * 100)}% tin cậy</strong>
      </div>
      <div className="ai-score-row">
        <span>Trạng thái AI đề xuất</span>
        <strong>{finalStatusLabel(evaluation.suggestedStatus)}</strong>
      </div>
      <div className="ai-result-columns">
        <div>
          <h4>Điểm mạnh</h4>
          <ul>{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h4>Cần cải thiện</h4>
          <ul>{evaluation.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>
  )
}

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

export function SubmissionReviewPanel({ submission, onReviewed }) {
  const [evaluationState, setEvaluationState] = useState({ status: 'loading', data: null })
  const [form, setForm] = useState({
    finalStatus: finalStatusForForm(submission.finalStatus),
    feedback: submission.feedback ?? '',
  })
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState({ status: 'idle' })

  useEffect(() => {
    let isMounted = true

    aiEvaluationService
      .getEvaluation(submission.id)
      .catch((error) => {
        if (error?.status !== 404 && error?.code !== 'AI_EVALUATION_NOT_FOUND') throw error
        return aiEvaluationService.createEvaluation(submission.id).then((result) => result.evaluation ?? result)
      })
      .then((result) => {
        if (isMounted) {
          const evaluation = mapEvaluation(result)
          setEvaluationState({ status: 'success', data: evaluation })
          setForm((current) => ({
            finalStatus: finalStatusForForm(submission.finalStatus, evaluation.suggestedStatus),
            feedback: current.feedback || evaluation.feedbackDraft,
          }))
        }
      })
      .catch((error) => {
        if (isMounted) {
          setEvaluationState({
            status: 'error',
            data: null,
            message: error?.message ?? 'Chưa có đề xuất AI cho bài nộp này.',
          })
        }
      })

    return () => { isMounted = false }
  }, [submission.id, submission.finalStatus])

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
  }
  const isFinalized = submission.status === 'approved'

  return (
    <section className="submission-review-panel" aria-labelledby="review-title">
      <div className="submission-review-heading">
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
        <span className={`review-state${isFinalized ? ' review-state-approved' : ''}`}>
          {isFinalized ? 'Đã chốt' : 'Chưa chốt'}
        </span>
      </div>

      {evaluationState.status === 'loading' && <p className="form-field-help">Đang tải đề xuất AI...</p>}
      {evaluationState.status === 'error' && (
        <div className="form-submit-message form-submit-error" role="alert">{evaluationState.message}</div>
      )}
      <AiResultCard evaluation={evaluation} />

      <form className="review-form" noValidate onSubmit={handleSubmit}>
        <div className="form-fields">
          <div className="form-field form-field-narrow">
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

          <div className="form-field form-field-wide">
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

        <div className="review-form-actions">
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

function AssignmentEditor({ assignment, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: assignment.title,
    dueAt: toTeacherDeadlineInput(assignment.dueAt),
    threshold: String(assignment.coverageThreshold),
    status: assignment.status,
  })
  const [state, setState] = useState({ status: 'idle' })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const dueAt = toAssignmentUpdateDeadline(form.dueAt, assignment.dueAt)
    if (!form.title.trim() || !dueAt) {
      setState({ status: 'error', message: 'Nhập tên và hạn nộp hợp lệ.' })
      return
    }

    setState({ status: 'loading' })
    try {
      await assignmentService.updateAssignment(assignment.id, {
        title: form.title.trim(),
        due_at: dueAt,
        coverage_threshold: Number(form.threshold),
        status: form.status,
      })
      onSaved()
    } catch (error) {
      setState({ status: 'error', message: error?.message ?? 'Không thể cập nhật bài kiểm tra.' })
    }
  }

  return (
    <form className="assignment-edit-form" noValidate onSubmit={handleSubmit}>
      <div className="form-fields">
        <div className="form-field form-field-wide">
          <label htmlFor="edit-assignment-title">Tên bài kiểm tra</label>
          <input id="edit-assignment-title" name="title" onChange={handleChange} value={form.title} />
        </div>
        <div className="form-field">
          <label htmlFor="edit-assignment-due">Hạn nộp</label>
          <input id="edit-assignment-due" name="dueAt" onChange={handleChange} type="datetime-local" value={form.dueAt} />
        </div>
        <div className="form-field form-field-narrow">
          <label htmlFor="edit-assignment-threshold">Ngưỡng đạt (%)</label>
          <input id="edit-assignment-threshold" max="100" min="0" name="threshold" onChange={handleChange} type="number" value={form.threshold} />
        </div>
        <div className="form-field form-field-narrow">
          <label htmlFor="edit-assignment-status">Trạng thái</label>
          <select id="edit-assignment-status" name="status" onChange={handleChange} value={form.status}>
            <option value="DRAFT">Bản nháp</option>
            <option value="OPEN">Đang mở</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
      </div>
      {state.status === 'error' && <div className="form-submit-message form-submit-error" role="alert">{state.message}</div>}
      <div className="assignment-form-actions">
        <button className="button button-outline" onClick={onCancel} type="button">Hủy</button>
        <button className="button button-primary" disabled={state.status === 'loading'} type="submit">
          {state.status === 'loading' ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  )
}

function AssignmentDetailWorkspace({ detail, onRefresh }) {
  const navigate = useNavigate()
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(detail.submissions[0]?.id ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteState, setDeleteState] = useState({ status: 'idle' })
  const selectedSubmission = selectTeacherSubmission(detail.submissions, selectedSubmissionId)

  async function handleDeleteAssignment() {
    if (typeof window !== 'undefined' && !window.confirm('Bạn có chắc muốn xóa bài kiểm tra này không?')) return
    setDeleteState({ status: 'loading' })
    try {
      await assignmentService.deleteAssignment(detail.id)
      navigate(`/classes/${detail.classroom.id}`)
    } catch (error) {
      setDeleteState({ status: 'error', message: error?.message ?? 'Không thể xóa bài kiểm tra.' })
    }
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn trang">
        <Link to={`/classes/${detail.classroom.id}`}>{detail.classroom.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Chi tiết bài kiểm tra</span>
      </nav>

      <section className="assignment-detail-hero" aria-labelledby="assignment-detail-title">
        {!isEditing ? (
          <>
            <div>
              <p className="state-kicker">Bài kiểm tra bài ghi</p>
              <h1 id="assignment-detail-title">{detail.title}</h1>
              <p>{detail.dueDate} · Ngưỡng đạt {detail.threshold} · {detail.submissions.length} bài nộp</p>
            </div>
            <div className="assignment-form-actions">
              <button className="button button-outline" onClick={() => setIsEditing(true)} type="button">Chỉnh sửa</button>
              <button className="button button-danger" disabled={deleteState.status === 'loading'} onClick={handleDeleteAssignment} type="button">
                {deleteState.status === 'loading' ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </>
        ) : (
          <AssignmentEditor
            assignment={detail}
            onCancel={() => setIsEditing(false)}
            onSaved={() => { setIsEditing(false); onRefresh() }}
          />
        )}
        {deleteState.status === 'error' && <p className="form-field-error" role="alert">{deleteState.message}</p>}
      </section>

      <div className="assignment-detail-grid">
        <ReferenceCard assignment={detail} onChanged={onRefresh} references={detail.references} />

        <section className="assignment-detail-card" aria-labelledby="submissions-title">
          <div className="assignment-detail-card-heading">
            <div>
              <p className="state-kicker">Theo dõi tiến độ</p>
              <h2 id="submissions-title">Bài nộp của học sinh</h2>
            </div>
            <span className="detail-card-label">{detail.submissions.length} bài nộp</span>
          </div>
          <p className="assignment-detail-card-description">
            Chọn một bài nộp để xem kết quả AI mô phỏng và chốt trạng thái cuối cùng.
          </p>

          <SubmissionList onSelect={setSelectedSubmissionId} selectedId={selectedSubmission?.id} submissions={detail.submissions} />
          {selectedSubmission && (
            <SubmissionReviewPanel key={selectedSubmission.id} onReviewed={onRefresh} submission={selectedSubmission} />
          )}
        </section>
      </div>
    </>
  )
}

function AssignmentDetailPage() {
  const { assignmentId } = useParams()
  const outletContext = useOutletContext()
  const classroom = outletContext?.classroom ?? null
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState({ status: 'loading', detail: null })

  useEffect(() => {
    let isMounted = true

    Promise.all([
      assignmentService.getAssignment(assignmentId),
      referenceService.listReferences(assignmentId),
      submissionService.listSubmissions(assignmentId),
    ])
      .then(([assignment, references, submissions]) => {
        if (isMounted) {
          const classInfo = classroom ?? {
            id: assignment.class_id,
            code: assignment.class_id,
            name: 'Lớp học',
          }
          setState({
            status: 'success',
            detail: {
              ...mapAssignment(assignment, classInfo),
              references: (references ?? []).map(mapReference),
              submissions: (submissions ?? []).map(mapTeacherSubmission),
            },
          })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({
            status: 'error',
            detail: null,
            message: error?.message ?? 'Không thể tải chi tiết bài kiểm tra.',
          })
        }
      })

    return () => { isMounted = false }
  }, [assignmentId, classroom, reloadToken])

  if (state.status === 'error') return <AssignmentDetailError message={state.message} />

  if (state.status === 'loading' || !state.detail) {
    return (
      <main className="page-content assignment-detail-page">
        <div className="page-container">
          <section className="state-panel" aria-live="polite" aria-busy="true">
            <p className="state-kicker">Chi tiết bài kiểm tra</p>
            <h1>Đang tải dữ liệu...</h1>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="page-content assignment-detail-page">
      <div className="page-container">
        <AssignmentDetailWorkspace
          detail={state.detail}
          onRefresh={() => setReloadToken((current) => current + 1)}
        />
      </div>
    </main>
  )
}

export default AssignmentDetailPage
