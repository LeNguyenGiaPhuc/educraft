import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { getClassDetailSnapshot } from '../data/mockClassDetail.js'
import {
  getAssignmentClassOptions,
  getDefaultAssignmentForm,
  submitAssignmentDraft,
  validateAssignmentForm,
} from '../data/mockCreateAssignment.js'

function requestedSubmissionState() {
  if (typeof window === 'undefined') {
    return 'success'
  }

  return new URLSearchParams(window.location.search).get('state') === 'error'
    ? 'error'
    : 'success'
}

function fieldDescribedBy(errorId, helpId, hasError) {
  return [hasError ? errorId : null, helpId].filter(Boolean).join(' ') || undefined
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

function FormBreadcrumb({ classroom }) {
  return (
    <nav className="breadcrumb" aria-label="Đường dẫn trang">
      <Link to="/">Lớp học</Link>
      <span aria-hidden="true">/</span>
      <Link to={`/classes/${classroom.id}`}>{classroom.name}</Link>
      <span aria-hidden="true">/</span>
      <span>Tạo bài kiểm tra</span>
    </nav>
  )
}

function CreateAssignmentError({ message }) {
  return (
    <PageErrorState
      kicker="Tạo bài kiểm tra"
      message={message}
      title="Không thể mở biểu mẫu"
    />
  )
}

function AssignmentSuccess({ classroom, onCreateAnother, submission }) {
  return (
    <section className="assignment-success" role="status" aria-live="polite">
      <p className="state-kicker">Đã tạo bài kiểm tra</p>
      <h1>Đã tạo bài kiểm tra</h1>
      <p>
        Bài “{submission.data.title}” đã được thêm vào lớp {classroom.name}. Bạn có thể xem lại
        trong danh sách bài kiểm tra.
      </p>
      <div className="assignment-success-actions">
        <Link className="button button-primary" to={`/classes/${classroom.id}`}>
          Về lớp học
        </Link>
        <button className="button button-outline" type="button" onClick={onCreateAnother}>
          Tạo bài khác
        </button>
      </div>
    </section>
  )
}

function CreateAssignmentForm({ classroom, form, errors, submission, onChange, onSubmit }) {
  const isSubmitting = submission.status === 'loading'
  const hasValidationErrors = Object.keys(errors).length > 0
  const options = getAssignmentClassOptions()

  return (
    <section className="assignment-form-card" aria-labelledby="assignment-form-title">
      <div className="assignment-form-heading">
        <p className="state-kicker">Thiết lập bài ghi</p>
        <h1 id="assignment-form-title">Tạo bài kiểm tra bài ghi</h1>
        <p>
          Chọn lớp, đặt hạn nộp và ngưỡng đạt để theo dõi bài ghi viết tay của học sinh.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit}>
        {hasValidationErrors && (
          <div className="form-error-summary" role="alert">
            <strong>Chưa thể tạo bài kiểm tra.</strong>
            <span>Kiểm tra các trường được đánh dấu rồi thử lại.</span>
          </div>
        )}

        {submission.status === 'error' && (
          <div className="form-submit-message form-submit-error" role="alert">
            {submission.message}
          </div>
        )}

        <div className="form-fields">
          <div className="form-field form-field-wide">
            <label htmlFor="assignment-title">
              Tên bài kiểm tra <span aria-hidden="true">*</span>
            </label>
            <input
              aria-describedby={fieldDescribedBy('assignment-title-error', 'assignment-title-help', Boolean(errors.title))}
              aria-invalid={Boolean(errors.title)}
              id="assignment-title"
              maxLength="120"
              name="title"
              onChange={onChange}
              placeholder="Ví dụ: Bài ghi Chuyện người con gái Nam Xương"
              type="text"
              value={form.title}
            />
            <p className="form-field-help" id="assignment-title-help">
              Tên này sẽ hiển thị trong danh sách bài kiểm tra của lớp.
            </p>
            <FieldError id="assignment-title-error" message={errors.title} />
          </div>

          <div className="form-field">
            <label htmlFor="assignment-class">
              Lớp học <span aria-hidden="true">*</span>
            </label>
            <select
              aria-describedby={fieldDescribedBy('assignment-class-error', null, Boolean(errors.classId))}
              aria-invalid={Boolean(errors.classId)}
              id="assignment-class"
              name="classId"
              onChange={onChange}
              value={form.classId}
            >
              <option value="">Chọn lớp học</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="assignment-class-error" message={errors.classId} />
          </div>

          <div className="form-field">
            <label htmlFor="assignment-due-at">
              Hạn nộp <span aria-hidden="true">*</span>
            </label>
            <input
              aria-describedby={fieldDescribedBy('assignment-due-at-error', 'assignment-due-at-help', Boolean(errors.dueAt))}
              aria-invalid={Boolean(errors.dueAt)}
              id="assignment-due-at"
              name="dueAt"
              onChange={onChange}
              type="datetime-local"
              value={form.dueAt}
            />
            <p className="form-field-help" id="assignment-due-at-help">
              Học sinh có thể nộp bài đến thời điểm này.
            </p>
            <FieldError id="assignment-due-at-error" message={errors.dueAt} />
          </div>

          <div className="form-field form-field-narrow">
            <label htmlFor="assignment-threshold">
              Ngưỡng đạt <span aria-hidden="true">*</span>
            </label>
            <div className="input-with-suffix">
              <input
                aria-describedby={fieldDescribedBy('assignment-threshold-error', 'assignment-threshold-help', Boolean(errors.threshold))}
                aria-invalid={Boolean(errors.threshold)}
                id="assignment-threshold"
                max="100"
                min="0"
                name="threshold"
                onChange={onChange}
                step="1"
                type="number"
                value={form.threshold}
              />
              <span aria-hidden="true">%</span>
            </div>
            <p className="form-field-help" id="assignment-threshold-help">
              Từ 0 đến 100%.
            </p>
            <FieldError id="assignment-threshold-error" message={errors.threshold} />
          </div>
        </div>

        <div className="assignment-form-actions">
          <Link className="button button-outline" to={`/classes/${classroom.id}`}>
            Hủy
          </Link>
          <button
            aria-busy={isSubmitting}
            className="button button-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo bài kiểm tra'}
          </button>
        </div>
      </form>
    </section>
  )
}

function CreateAssignmentWorkspace({ classId, classroom }) {
  const [form, setForm] = useState(() => getDefaultAssignmentForm(classId))
  const [errors, setErrors] = useState({})
  const [submission, setSubmission] = useState({ status: 'idle' })

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
    setSubmission((current) => (current.status === 'idle' ? current : { status: 'idle' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateAssignmentForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmission({ status: 'idle' })
      return
    }

    setSubmission({ status: 'loading' })

    try {
      const result = await submitAssignmentDraft(form, requestedSubmissionState(), 650)
      setSubmission(result)
    } catch {
      setSubmission({
        status: 'error',
        message: 'Không thể tạo bài kiểm tra lúc này. Vui lòng thử lại.',
      })
    }
  }

  function handleCreateAnother() {
    setForm(getDefaultAssignmentForm(classId))
    setErrors({})
    setSubmission({ status: 'idle' })
  }

  const successClassroomSnapshot =
    submission.status === 'success'
      ? getClassDetailSnapshot(submission.data.classId)
      : null
  const successClassroom =
    successClassroomSnapshot?.status === 'success'
      ? successClassroomSnapshot.data
      : classroom

  return (
    <>
      <FormBreadcrumb classroom={classroom} />

      {submission.status === 'success' ? (
        <AssignmentSuccess
          classroom={successClassroom}
          onCreateAnother={handleCreateAnother}
          submission={submission}
        />
      ) : (
        <CreateAssignmentForm
          classroom={classroom}
          errors={errors}
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submission={submission}
        />
      )}
    </>
  )
}

function CreateAssignmentPage() {
  const { classId = '10A1' } = useParams()
  const snapshot = getClassDetailSnapshot(classId)

  if (snapshot.status === 'error') {
    return <CreateAssignmentError message={snapshot.message} />
  }

  return (
    <main className="page-content assignment-page">
      <div className="page-container">
        <CreateAssignmentWorkspace
          key={classId}
          classId={classId}
          classroom={snapshot.data}
        />
      </div>
    </main>
  )
}

export default CreateAssignmentPage
