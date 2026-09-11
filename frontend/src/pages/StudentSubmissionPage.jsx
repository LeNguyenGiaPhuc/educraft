import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import {
  getAssignmentSnapshot,
} from '../data/mockClassDetail.js'
import {
  submitNote,
  validateSubmissionForm,
} from '../data/mockSubmission.js'

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
    />
  )
}

function SubmissionSuccess({ assignment, submission, onSubmitAnother }) {
  return (
    <section className="assignment-success" role="status" aria-live="polite">
      <p className="state-kicker">Đã nhận bài nộp</p>
      <h1>Nộp bài thành công</h1>
      <p>
        File <strong>{submission.data.fileName}</strong> đã được ghi nhận cho bài
        “{assignment.title}”.
      </p>
      <div className="assignment-success-actions">
        <Link
          className="button button-primary"
          to={`/classes/${assignment.classroom.id}`}
        >
          Về lớp học
        </Link>
        <button className="button button-outline" type="button" onClick={onSubmitAnother}>
          Nộp bài khác
        </button>
      </div>
    </section>
  )
}

function StudentSubmissionForm({ assignment, form, errors, submission, onFileChange, onSubmit }) {
  const isSubmitting = submission.status === 'loading'
  const hasValidationErrors = Object.keys(errors).length > 0

  return (
    <section className="assignment-form-card" aria-labelledby="submission-form-title">
      <div className="assignment-form-heading">
        <p className="state-kicker">Góc nhìn học sinh · {assignment.classroom.name}</p>
        <h1 id="submission-form-title">Nộp bài ghi</h1>
        <p>
          {assignment.title} · Hạn nộp {assignment.dueDate}
        </p>
      </div>

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
              Ảnh bài ghi <span aria-hidden="true">*</span>
            </label>
            <input
              accept="image/png,image/jpeg"
              aria-describedby={errors.file ? 'note-file-help note-file-error' : 'note-file-help'}
              aria-invalid={Boolean(errors.file)}
              id="note-file"
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
          <Link className="button button-outline" to={`/classes/${assignment.classroom.id}`}>
            Hủy
          </Link>
          <button
            aria-busy={isSubmitting}
            className="button button-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </div>
      </form>
    </section>
  )
}

function StudentSubmissionWorkspace({ assignment }) {
  const [form, setForm] = useState({
    assignmentId: assignment.id,
    studentId: 'HS260101',
    fileName: '',
    fileSizeBytes: 0,
  })
  const [errors, setErrors] = useState({})
  const [submission, setSubmission] = useState({ status: 'idle' })

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

    const nextErrors = validateSubmissionForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmission({ status: 'idle' })
      return
    }

    setSubmission({ status: 'loading' })

    try {
      const result = await submitNote(form, requestedSubmissionState(), 650)
      setSubmission(result)
    } catch {
      setSubmission({
        status: 'error',
        message: 'Không thể nộp bài lúc này. Vui lòng thử lại.',
      })
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

  return submission.status === 'success' ? (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn trang">
        <Link to={`/classes/${assignment.classroom.id}`}>{assignment.classroom.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Nộp bài ghi</span>
      </nav>
      <SubmissionSuccess
        assignment={assignment}
        onSubmitAnother={handleSubmitAnother}
        submission={submission}
      />
    </>
  ) : (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn trang">
        <Link to={`/classes/${assignment.classroom.id}`}>{assignment.classroom.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Nộp bài ghi</span>
      </nav>
      <StudentSubmissionForm
        assignment={assignment}
        errors={errors}
        form={form}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
        submission={submission}
      />
    </>
  )
}

function StudentSubmissionPage() {
  const { assignmentId = 'nam-xuong' } = useParams()
  const snapshot = getAssignmentSnapshot(assignmentId)

  if (snapshot.status === 'error') {
    return <SubmissionError message={snapshot.message} />
  }

  return (
    <main className="page-content assignment-page">
      <div className="page-container">
        <StudentSubmissionWorkspace assignment={snapshot.data} />
      </div>
    </main>
  )
}

export default StudentSubmissionPage
