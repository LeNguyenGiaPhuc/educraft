import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { formatAssignmentDeadline, getAssignmentAvailability } from '../data/assignmentDeadline.js'
import { getStudentAssignmentSnapshot } from '../data/mockStudentAccess.js'
import {
  getStudentSubmissionHistory,
  submitStudentNote,
} from '../data/mockStudentSubmission.js'
import { validateSubmissionForm } from '../data/mockSubmission.js'

function requestedSubmissionState() {
  if (typeof window === 'undefined') {
    return 'success'
  }

  return new URLSearchParams(window.location.search).get('state') === 'error'
    ? 'error'
    : 'success'
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

function SubmissionError({ message }) {
  return (
    <PageErrorState
      kicker="Nộp bài ghi"
      message={message}
      title="Không thể mở bài kiểm tra"
      returnTo="/student"
    />
  )
}

function SubmissionSuccess({ assignment, canResubmit, onSubmitAnother, submission }) {
  return (
    <section className="assignment-success" role="status" aria-live="polite">
      <p className="state-kicker">Đã nhận bài nộp</p>
      <h1>Nộp bài thành công</h1>
      <p>
        File <strong>{submission.data.fileName}</strong> đã được ghi nhận cho bài
        “{assignment.title}”.
      </p>
      <div className="assignment-success-actions">
        {canResubmit && (
          <button className="button button-primary" type="button" onClick={onSubmitAnother}>
            Nộp lại
          </button>
        )}
        <Link
          className="button button-outline"
          to="/student"
        >
          Về tổng quan học sinh
        </Link>
      </div>
    </section>
  )
}

function formatSubmissionDate(value) {
  const submittedAt = Date.parse(value)

  if (!Number.isFinite(submittedAt)) return 'Không xác định'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(submittedAt)
}

function submissionStatusLabel(status) {
  if (status === 'approved') return 'Đã chốt'
  if (status === 'processing') return 'Đang xử lý'
  return status === 'submitted' ? 'Đã nộp' : status
}

function SubmissionHistory({ submissions }) {
  return (
    <section className="student-submission-history" aria-labelledby="submission-history-title">
      <div className="detail-section-heading">
        <div>
          <h2 id="submission-history-title">Lịch sử nộp bài</h2>
          <p>Mỗi lần nộp được lưu thành một bài riêng.</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="table-empty">Bạn chưa nộp bài cho hoạt động này.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table student-submission-table">
            <thead>
              <tr>
                <th scope="col">Lần nộp</th>
                <th scope="col">Tên file</th>
                <th scope="col">Thời gian nộp</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((item) => (
                <tr key={item.id}>
                  <td className="table-primary-cell">Lần {item.attemptNumber}</td>
                  <td>{item.fileName}</td>
                  <td className="table-muted-cell">{formatSubmissionDate(item.submittedAt)}</td>
                  <td>
                    <span className="table-status table-status-active">
                      <span aria-hidden="true" />
                      {submissionStatusLabel(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StudentSubmissionForm({ assignment, availability, form, hasPreviousSubmissions, errors, submission, onFileChange, onSubmit }) {
  const isSubmitting = submission.status === 'loading'
  const hasValidationErrors = Object.keys(errors).length > 0

  return (
    <section className="assignment-form-card" aria-labelledby="submission-form-title">
      <div className="assignment-form-heading">
        <p className="state-kicker">Góc nhìn học sinh · {assignment.classroom.name}</p>
        <h1 id="submission-form-title">{assignment.title}</h1>
        <p>Hạn nộp: {formatAssignmentDeadline(assignment)}</p>
        <span className={`table-status table-status-${availability.isOpen ? 'active' : 'closed'}`}>
          <span aria-hidden="true" />
          {availability.isOpen ? 'Đang mở' : 'Đã đóng'}
        </span>
      </div>

      {!availability.isOpen ? (
        <>
          <p className="form-submit-message" role="status">{availability.message}</p>
          <div className="assignment-form-actions">
            <Link className="button button-primary" to="/student">
              Về tổng quan học sinh
            </Link>
          </div>
        </>
      ) : (
      <form noValidate onSubmit={onSubmit}>
        {hasValidationErrors && (
          <div className="form-error-summary" role="alert">
            <strong>Chưa thể nộp bài.</strong>
            <span>Kiểm tra file bài ghi rồi thử lại.</span>
          </div>
        )}

        {submission.status === 'error' && (
          <div className="form-submit-message form-submit-error" role="alert">
            {submission.message}
          </div>
        )}

        <div className="form-fields">
          <div className="form-field form-field-wide">
            <label htmlFor="note-file">
              {hasPreviousSubmissions ? 'Ảnh bài ghi mới' : 'Ảnh bài ghi'} <span aria-hidden="true">*</span>
            </label>
            <input
              accept="image/png,image/jpeg"
              aria-describedby={errors.file ? 'note-file-help note-file-error' : 'note-file-help'}
              aria-invalid={Boolean(errors.file)}
              id="note-file"
              disabled={isSubmitting}
              name="file"
              onChange={onFileChange}
              type="file"
            />
            <p className="form-field-help" id="note-file-help">
              Chọn file JPG, JPEG hoặc PNG, tối đa 5 MB. Đây là luồng mock nên ảnh chưa được tải lên server.
            </p>
            {form.fileName && (
              <p className="form-field-help">Đã chọn: {form.fileName}</p>
            )}
            <FieldError id="note-file-error" message={errors.file} />
          </div>
        </div>

        <div className="assignment-form-actions">
          <Link className="button button-outline" to="/student">
            Hủy
          </Link>
          <button
            aria-busy={isSubmitting}
            className="button button-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Đang nộp...' : hasPreviousSubmissions ? 'Nộp lại' : 'Nộp bài'}
          </button>
        </div>
      </form>
      )}
    </section>
  )
}

function StudentSubmissionWorkspace({ assignment, currentUser }) {
  const [form, setForm] = useState({
    assignmentId: assignment.id,
    fileName: '',
    fileSizeBytes: 0,
  })
  const [errors, setErrors] = useState({})
  const [submission, setSubmission] = useState({ status: 'idle' })
  const [now, setNow] = useState(Date.now)
  const pending = useRef(false)
  const availability = getAssignmentAvailability(assignment, now)
  const historySnapshot = getStudentSubmissionHistory(currentUser, assignment.id)
  const submissionHistory = historySnapshot.status === 'success' ? historySnapshot.data : []

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    setForm((current) => ({
      ...current,
      fileName: file?.name ?? '',
      fileSizeBytes: file?.size ?? 0,
    }))
    setErrors({})
    setSubmission({ status: 'idle' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return

    const currentAvailability = getAssignmentAvailability(assignment)
    setNow(Date.now())
    if (!currentAvailability.isOpen) {
      setSubmission({ status: 'error', message: currentAvailability.message })
      return
    }

    const nextErrors = validateSubmissionForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmission({ status: 'idle' })
      return
    }

    pending.current = true
    setSubmission({ status: 'loading' })

    try {
      const result = await submitStudentNote(currentUser, form, requestedSubmissionState(), 650)
      setSubmission(result)
    } catch {
      setSubmission({
        status: 'error',
        message: 'Không thể nộp bài lúc này. Vui lòng thử lại.',
      })
    } finally {
      pending.current = false
      setNow(Date.now())
    }
  }

  function handleSubmitAnother() {
    setForm((current) => ({
      ...current,
      fileName: '',
      fileSizeBytes: 0,
    }))
    setErrors({})
    setSubmission({ status: 'idle' })
  }

  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn trang">
        <Link to="/student">Tổng quan học sinh</Link>
        <span aria-hidden="true">/</span>
        <span>Nộp bài ghi</span>
      </nav>
      {submission.status === 'success' ? (
        <SubmissionSuccess
          assignment={assignment}
          canResubmit={availability.isOpen}
          onSubmitAnother={handleSubmitAnother}
          submission={submission}
        />
      ) : (
        <StudentSubmissionForm
          assignment={assignment}
          availability={availability}
          errors={errors}
          form={form}
          hasPreviousSubmissions={submissionHistory.length > 0}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          submission={submission}
        />
      )}
      <SubmissionHistory submissions={submissionHistory} />
    </>
  )
}

function StudentSubmissionPage({ currentUser }) {
  const { assignmentId } = useParams()
  const snapshot = getStudentAssignmentSnapshot(currentUser, assignmentId)

  if (snapshot.status === 'error') {
    return <SubmissionError message={snapshot.message} />
  }

  return (
    <main className="page-content assignment-page">
      <div className="page-container">
        <StudentSubmissionWorkspace
          key={`${currentUser.id}:${assignmentId}`}
          assignment={snapshot.data}
          currentUser={currentUser}
        />
      </div>
    </main>
  )
}

export default StudentSubmissionPage
