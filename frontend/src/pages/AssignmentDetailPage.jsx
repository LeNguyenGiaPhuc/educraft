import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { getAssignmentDetailSnapshot } from '../data/mockClassDetail.js'
import {
  getFinalReviewStatusLabel,
  getMockAiEvaluation,
  reviewSubmission,
  validateReviewForm,
} from '../data/mockSubmission.js'
import {
  submitReference,
  validateReferenceForm,
} from '../data/mockReference.js'

function requestedWorkflowState() {
  if (typeof window === 'undefined') {
    return 'success'
  }

  return new URLSearchParams(window.location.search).get('state') === 'error'
    ? 'error'
    : 'success'
}

function formatSubmissionDate(value) {
  if (!value) {
    return 'Chưa có thời gian'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function FieldError({ id, message }) {
  if (!message) {
    return null
  }

  return (
    <p className="form-field-error" id={id} role="alert">
      {message}
    </p>
  )
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

function ReferenceCard({ assignment, reference, onSaved }) {
  const [form, setForm] = useState({
    assignmentId: assignment.id,
    fileName: '',
    fileSizeBytes: 0,
  })
  const [errors, setErrors] = useState({})
  const [upload, setUpload] = useState({ status: 'idle' })

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    setForm((current) => ({
      ...current,
      fileName: file?.name ?? '',
      fileSizeBytes: file?.size ?? 0,
    }))
    setErrors({})
    setUpload({ status: 'idle' })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateReferenceForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setUpload({ status: 'idle' })
      return
    }

    setUpload({ status: 'loading' })

    try {
      const result = await submitReference(form, requestedWorkflowState(), 450)
      setUpload(result)

      if (result.status === 'success') {
        onSaved(result.data)
        setForm({
          assignmentId: assignment.id,
          fileName: '',
          fileSizeBytes: 0,
        })
      }
    } catch {
      setUpload({
        status: 'error',
        message: 'Không thể lưu bài mẫu lúc này. Vui lòng thử lại.',
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
        <span className="detail-card-label">Bản tham chiếu</span>
      </div>

      <p className="assignment-detail-card-description">
        Upload ảnh bài ghi mẫu để làm tài liệu tham chiếu khi AI phân tích và giáo viên chấm duyệt.
      </p>

      {reference ? (
        <div className="reference-file" role="status">
          <div>
            <strong>{reference.fileName}</strong>
            <span>Đã thêm {formatSubmissionDate(reference.uploadedAt)}</span>
          </div>
          <span className="table-status table-status-active">
            <span aria-hidden="true" />
            Đã có bài mẫu
          </span>
        </div>
      ) : (
        <div className="reference-empty">Chưa có bài mẫu cho bài kiểm tra này.</div>
      )}

      <form className="reference-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="reference-file">
            {reference ? 'Thay bài mẫu' : 'Thêm bài mẫu'} <span aria-hidden="true">*</span>
          </label>
          <input
            accept="image/png,image/jpeg"
            aria-describedby={errors.file ? 'reference-file-help reference-file-error' : 'reference-file-help'}
            aria-invalid={Boolean(errors.file)}
            id="reference-file"
            onChange={handleFileChange}
            type="file"
          />
          <p className="form-field-help" id="reference-file-help">
            JPG, JPEG hoặc PNG, tối đa 5 MB. Prototype chỉ lưu thông tin file.
          </p>
          {form.fileName && <p className="form-field-help">Đã chọn: {form.fileName}</p>}
          <FieldError id="reference-file-error" message={errors.file} />
        </div>

        {upload.status === 'error' && (
          <div className="form-submit-message form-submit-error" role="alert">
            {upload.message}
          </div>
        )}

        {upload.status === 'success' && (
          <div className="form-submit-message form-submit-success" role="status">
            Đã lưu bài mẫu cho bài kiểm tra.
          </div>
        )}

        <button
          aria-busy={upload.status === 'loading'}
          className="button button-outline"
          disabled={upload.status === 'loading'}
          type="submit"
        >
          {upload.status === 'loading' ? 'Đang lưu...' : reference ? 'Cập nhật bài mẫu' : 'Lưu bài mẫu'}
        </button>
      </form>
    </section>
  )
}

function submissionStatusLabel(submission) {
  if (submission.status === 'approved') {
    return `Đã chốt · ${getFinalReviewStatusLabel(submission.finalStatus)}`
  }

  return 'Chờ giáo viên chốt'
}

function SubmissionList({ submissions, selectedId, onSelect }) {
  if (submissions.length === 0) {
    return (
      <div className="table-empty assignment-submissions-empty">
        <p>Chưa có bài nộp nào trong dữ liệu mock cho bài kiểm tra này.</p>
      </div>
    )
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
            {submission.studentId.slice(-2)}
          </span>
          <span className="submission-list-main">
            <strong>{submission.studentId}</strong>
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
        <strong>{getFinalReviewStatusLabel(evaluation.suggestedStatus)}</strong>
      </div>
      <div className="ai-result-columns">
        <div>
          <h4>Điểm mạnh</h4>
          <ul>
            {evaluation.strengths.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h4>Cần cải thiện</h4>
          <ul>
            {evaluation.weaknesses.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}

function SubmissionReviewPanel({ submission, onReviewed }) {
  const evaluation = getMockAiEvaluation(submission)
  const [form, setForm] = useState({
    submissionId: submission.id,
    finalStatus: submission.finalStatus ?? evaluation.suggestedStatus,
    feedback: submission.feedback ?? evaluation.feedbackDraft,
  })
  const [errors, setErrors] = useState({})
  const [review, setReview] = useState({ status: 'idle' })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) {
        return current
      }

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

    if (Object.keys(nextErrors).length > 0) {
      setReview({ status: 'idle' })
      return
    }

    setReview({ status: 'loading' })

    try {
      const result = await reviewSubmission(
        { ...form, submission },
        requestedWorkflowState(),
        450,
      )
      setReview(result)

      if (result.status === 'success') {
        onReviewed(result.data)
      }
    } catch {
      setReview({
        status: 'error',
        message: 'Không thể lưu kết quả chấm lúc này. Vui lòng thử lại.',
      })
    }
  }

  return (
    <section className="submission-review-panel" aria-labelledby="review-title">
      <div className="submission-review-heading">
        <div>
          <p className="state-kicker">Duyệt bài nộp</p>
          <h3 id="review-title">{submission.studentId}</h3>
          <p>{submission.fileName} · Nộp lúc {formatSubmissionDate(submission.submittedAt)}</p>
        </div>
        <span className={`review-state${submission.status === 'approved' ? ' review-state-approved' : ''}`}>
          {submission.status === 'approved' ? 'Đã chốt' : 'Chưa chốt'}
        </span>
      </div>

      <AiResultCard evaluation={evaluation} />

      <form className="review-form" noValidate onSubmit={handleSubmit}>
        <div className="form-fields">
          <div className="form-field form-field-narrow">
            <label htmlFor="review-final-status">
              Kết quả giáo viên chốt <span aria-hidden="true">*</span>
            </label>
            <select
              aria-describedby={errors.finalStatus ? 'review-final-status-error' : undefined}
              aria-invalid={Boolean(errors.finalStatus)}
              id="review-final-status"
              name="finalStatus"
              onChange={handleChange}
              value={form.finalStatus}
            >
              <option value="completed">Completed</option>
              <option value="needs_completion">Needs Completion</option>
              <option value="requires_teacher_review">Requires Teacher Review</option>
            </select>
            <FieldError id="review-final-status-error" message={errors.finalStatus} />
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="review-feedback">
              Nhận xét cuối <span aria-hidden="true">*</span>
            </label>
            <textarea
              aria-describedby={errors.feedback ? 'review-feedback-error' : undefined}
              aria-invalid={Boolean(errors.feedback)}
              id="review-feedback"
              name="feedback"
              onChange={handleChange}
              rows="4"
              value={form.feedback}
            />
            <FieldError id="review-feedback-error" message={errors.feedback} />
          </div>
        </div>

        {review.status === 'error' && (
          <div className="form-submit-message form-submit-error" role="alert">
            {review.message}
          </div>
        )}

        {review.status === 'success' && (
          <div className="form-submit-message form-submit-success" role="status">
            Đã chốt trạng thái và nhận xét cho học sinh.
          </div>
        )}

        <div className="review-form-actions">
          <span>Kết quả cuối cùng do giáo viên quyết định.</span>
          <button
            aria-busy={review.status === 'loading'}
            className="button button-primary"
            disabled={review.status === 'loading'}
            type="submit"
          >
            {review.status === 'loading' ? 'Đang lưu...' : 'Chốt kết quả'}
          </button>
        </div>
      </form>
    </section>
  )
}

function AssignmentDetailWorkspace({ detail, onRefresh }) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(
    detail.submissions[0]?.id ?? null,
  )
  const selectedSubmission = detail.submissions.find(
    (submission) => submission.id === selectedSubmissionId,
  ) ?? detail.submissions[0]

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn trang">
        <Link to={`/classes/${detail.classroom.id}`}>{detail.classroom.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Chi tiết bài kiểm tra</span>
      </nav>

      <section className="assignment-detail-hero" aria-labelledby="assignment-detail-title">
        <div>
          <p className="state-kicker">Bài kiểm tra bài ghi</p>
          <h1 id="assignment-detail-title">{detail.title}</h1>
          <p>{detail.dueDate} · Ngưỡng đạt {detail.threshold} · {detail.submission}</p>
        </div>
      </section>

      <div className="assignment-detail-grid">
        <ReferenceCard
          assignment={detail}
          onSaved={onRefresh}
          reference={detail.reference}
        />

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

          <SubmissionList
            onSelect={setSelectedSubmissionId}
            selectedId={selectedSubmission?.id}
            submissions={detail.submissions}
          />

          {selectedSubmission && (
            <SubmissionReviewPanel
              key={selectedSubmission.id}
              onReviewed={onRefresh}
              submission={selectedSubmission}
            />
          )}
        </section>
      </div>
    </>
  )
}

function AssignmentDetailPage() {
  const { assignmentId = 'nam-xuong' } = useParams()
  const [, setRefreshVersion] = useState(0)
  const snapshot = getAssignmentDetailSnapshot(assignmentId)

  function refreshDetail() {
    setRefreshVersion((current) => current + 1)
  }

  if (snapshot.status === 'error') {
    return <AssignmentDetailError message={snapshot.message} />
  }

  return (
    <main className="page-content assignment-detail-page">
      <div className="page-container">
        <AssignmentDetailWorkspace detail={snapshot.data} onRefresh={refreshDetail} />
      </div>
    </main>
  )
}

export default AssignmentDetailPage
