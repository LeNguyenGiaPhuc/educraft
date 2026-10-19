import { Fragment, useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { formatAssignmentDeadline, getAssignmentAvailability } from '../data/assignmentDeadline.js'
import {
  validateSubmissionForm,
} from '../data/submissionValidation.js'
import { submissionService } from '../services/submissionService.js'
import { createStudentSubmissionSession } from '../data/studentSubmissionSession.js'
import { studentPage } from '../data/studentArchive.js'
import StudentPagination from '../components/student/StudentPagination.jsx'
import PaperEdge from '../components/kinetic/PaperEdge.jsx'
import '../styles/student-folio.css'

function getFinalReviewStatusLabel(status) {
  return { completed: 'Hoàn thành', needs_completion: 'Cần bổ sung', requires_teacher_review: 'Cần giáo viên xem lại' }[status] ?? 'Cần giáo viên xem lại'
}

const submissionDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
})

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
      message={message}
      title="Không thể mở bài kiểm tra"
      returnTo="/student"
    />
  )
}

function SubmissionSuccess({ assignment, canResubmit, onSubmitAnother, request }) {
  return (
    <section className="assignment-success student-success-panel" role="status" aria-live="polite">
      <PaperEdge trigger={request.data.id} />
      <div className="sf-receipt-heading">
        <span className="sf-receipt-fold" aria-hidden="true">✓</span>
        <div>
          <span className="sf-section-kicker">Đã ghi nhận</span>
          <h2>Nộp bài thành công</h2>
        </div>
      </div>
      <p>
        File <strong>{request.data.fileName}</strong> đã được ghi nhận cho bài
        “{assignment.title}”.
      </p>
      <div className="assignment-success-actions student-success-actions">
        {canResubmit && <button className="button button-primary" type="button" onClick={onSubmitAnother}>Nộp lại</button>}
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

  return submissionDateFormatter.format(submittedAt)
}

function submissionStatusLabel(status) {
  if (status === 'approved') return 'Kết quả'
  if (status === 'awaiting_review') return 'Chờ giáo viên chốt'
  if (status === 'processing') return 'Đang xử lý'
  return status === 'submitted' ? 'Đã nộp' : 'Chưa xác định'
}

function submissionStatusClass(status) {
  return String(status ?? 'unknown').replaceAll('_', '-')
}

function getLatestSubmission(submissions) {
  return submissions.reduce((latest, submission) => (
    !latest || submission.attemptNumber > latest.attemptNumber ? submission : latest
  ), null)
}

function getCurrentProgressStep(history, availability, latestSubmission) {
  if (history.status !== 'success') return null
  if (!latestSubmission) return availability.isOpen ? 'Bài kiểm tra' : null
  return latestSubmission.result ? null : 'Giáo viên chốt'
}

function getSubmissionProgressStep(history, availability, latestSubmission) {
  if (history.status === 'error') {
    return { state: 'error', status: 'Chưa tải được', detail: 'Lỗi này không làm thay đổi trạng thái mở hoặc đóng ở trên.' }
  }

  if (history.status !== 'success') {
    return { state: 'loading', status: 'Đang tải', detail: 'Đang kiểm tra lịch sử nộp bài.' }
  }

  if (!latestSubmission) {
    return {
      state: 'upcoming',
      status: 'Chưa nộp',
      detail: availability.isOpen ? 'Chọn ảnh bài ghi để gửi trước hạn.' : 'Bài đã đóng nên không nhận thêm bài nộp.',
    }
  }

  return {
    state: 'complete',
    status: `${history.submissions.length} lượt đã tải`,
    detail: `Đang theo dõi lần nộp ${latestSubmission.attemptNumber}.`,
  }
}

function getReviewProgressStep(history, latestSubmission) {
  if (history.status === 'error') {
    return { state: 'error', status: 'Chưa xác định', detail: 'Không thể xác nhận kết quả khi lịch sử chưa tải được.' }
  }

  if (history.status !== 'success') {
    return { state: 'loading', status: 'Đang tải', detail: 'Đang kiểm tra kết quả giáo viên chốt.' }
  }

  if (!latestSubmission) {
    return { state: 'upcoming', status: 'Chưa có kết quả', detail: 'Kết quả chỉ xuất hiện sau khi có bài nộp và giáo viên chốt.' }
  }

  if (!latestSubmission.result) {
    return {
      state: 'waiting',
      status: 'Chờ giáo viên chốt',
      detail: 'Kết quả sẽ xuất hiện trong lịch sử sau khi giáo viên chốt.',
    }
  }

  return {
    state: 'complete',
    status: getFinalReviewStatusLabel(latestSubmission.result.finalStatus),
    detail: 'Giáo viên đã chốt kết quả cho lần nộp gần nhất.',
  }
}

function StudentProgress({ assignment, availability, history }) {
  const latestSubmission = getLatestSubmission(history.submissions)
  const currentStep = getCurrentProgressStep(history, availability, latestSubmission)
  const submissionStep = getSubmissionProgressStep(history, availability, latestSubmission)
  const reviewStep = getReviewProgressStep(history, latestSubmission)

  const steps = [
    {
      title: 'Bài kiểm tra',
      state: availability.isOpen ? 'ready' : 'closed',
      current: currentStep === 'Bài kiểm tra',
      status: availability.isOpen ? 'Đang mở' : 'Đã đóng',
      detail: availability.isOpen
        ? `Hạn nộp ${formatAssignmentDeadline(assignment)}.`
        : availability.message,
    },
    { title: 'Bài nộp', ...submissionStep },
    { title: 'Giáo viên chốt', current: currentStep === 'Giáo viên chốt', ...reviewStep },
  ]

  return (
    <section className="sf-assignment-context" aria-labelledby="sf-assignment-title">
      <div className="sf-context-identity">
        <span className="sf-section-kicker">Bài cần hoàn thành</span>
        <h1 id="sf-assignment-title">{assignment.title}</h1>
        <p>{assignment.classroom.name}</p>
      </div>
      <dl className="sf-context-facts"><div><dt>Hạn nộp</dt><dd>{formatAssignmentDeadline(assignment)}</dd></div><div><dt>Trạng thái bài</dt><dd>{availability.isOpen ? 'Đang mở' : 'Đã đóng'}</dd></div></dl>
      <ul className="sf-status-ledger" aria-label="Trạng thái bài làm" aria-live="polite">
        {steps.map(step => (
          <li
            aria-current={step.current ? 'true' : undefined}
            className={`sf-ledger-entry sf-ledger-${step.state}`}
            key={step.title}
          >
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
            <strong>{step.status}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SubmissionHistory({ submissions, status, message }) {
  const [page, setPage] = useState(1)
  const view = studentPage(submissions, page, 20)
  return (
    <section className="student-submission-history" aria-labelledby="submission-history-title">
      <div className="detail-section-heading student-history-heading">
        <div>
          <h2 id="submission-history-title">Lịch sử nộp bài</h2>
          <p>
            Mỗi lần nộp được lưu riêng. Kết quả chỉ xuất hiện sau khi giáo viên chốt.
          </p>
        </div>
        <span className="sf-history-count">{submissions.length} lượt đã tải</span>
      </div>

      {status === 'loading' && <p className="sf-history-notice" role="status">Đang tải lịch sử nộp bài…</p>}
      {status === 'error' && <p className="sf-history-notice" role="alert">{message} Những lượt vừa được xác nhận vẫn hiển thị bên dưới.</p>}
      {submissions.length === 0 ? (
        status === 'success' ? <div className="table-empty">Bạn chưa nộp bài cho hoạt động này.</div> : null
      ) : (
        <div className="data-table-wrap student-history-wrap">
          <table className="data-table student-submission-table student-history-table">
            <thead>
              <tr>
                <th scope="col">Lần nộp</th>
                <th scope="col">Tên file</th>
                <th scope="col">Thời gian nộp</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {view.items.map((item) => (
                <Fragment key={item.id}>
                  <tr data-submission-id={item.id}>
                    <td className="table-primary-cell" data-label="Lần nộp"><span className="sf-attempt-number">{String(item.attemptNumber).padStart(2, '0')}</span><span>Lần {item.attemptNumber}</span></td>
                    <td data-label="Tên file">{item.fileName}</td>
                    <td className="table-muted-cell" data-label="Thời gian nộp">{formatSubmissionDate(item.submittedAt)}</td>
                    <td data-label="Trạng thái">
                      <span className={`table-status table-status-active student-history-status student-history-status--${submissionStatusClass(item.status)}`}>
                        <span aria-hidden="true" />
                        {submissionStatusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                  {item.result && (
                    <tr className="student-submission-result-row">
                      <td className="student-history-result-cell" colSpan="4">
                        <details className="student-submission-result">
                          <summary className="student-final-result-heading">
                            <span>Kết quả do giáo viên chốt</span>
                            <strong>{getFinalReviewStatusLabel(item.result.finalStatus)}</strong>
                          </summary>
                          <p className="sf-teacher-annotation">
                            <strong>Nhận xét:</strong> {item.result.feedback}
                          </p>
                        </details>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {submissions.length > 0 && <StudentPagination view={view} onPage={setPage} label="Phân trang lịch sử nộp bài" />}
    </section>
  )
}

export function StudentSubmissionForm({ assignment, availability, form, hasPreviousSubmissions, errors, request, onFileChange, onSubmit }) {
  const isSubmitting = request.status === 'loading'
  const hasValidationErrors = Object.keys(errors).length > 0

  return (
    <section className="assignment-form-card student-submit-card" aria-labelledby="submission-form-title">
      <PaperEdge trigger={form.fileName} />
      <div className="assignment-form-heading student-submit-heading">
        <span className="sf-section-kicker">{availability.isOpen ? 'Bước tiếp theo' : 'Trạng thái bài'}</span>
        <h2 id="submission-form-title">{availability.isOpen ? 'Nộp bài ghi' : 'Bài đã đóng'}</h2>
        <p>{assignment.classroom.name} · Hạn nộp: {formatAssignmentDeadline(assignment)}</p>
        <span className={`table-status table-status-${availability.isOpen ? 'active' : 'closed'} student-submit-status`}>
          <span aria-hidden="true" />
          {availability.isOpen ? 'Đang mở' : 'Đã đóng'}
        </span>
      </div>

      {!availability.isOpen ? (
        <>
          <p className="form-submit-message student-submit-closed-message" role="status">{availability.message}</p>
          <div className="assignment-form-actions student-form-actions">
            <Link className="button button-primary" to="/student">
              Về tổng quan học sinh
            </Link>
          </div>
        </>
      ) : (
      <form className="student-submit-form" noValidate onSubmit={onSubmit}>
        {hasValidationErrors && (
          <div className="form-error-summary student-form-error-summary" role="alert">
            <strong>Chưa thể nộp bài.</strong>
            <span>Kiểm tra file bài ghi rồi thử lại.</span>
          </div>
        )}

        {request.status === 'error' && (
          <div className="form-submit-message form-submit-error student-form-submit-error" role="alert">
            {request.message}
          </div>
        )}

        <div className="form-fields student-fields-grid">
          <div className="form-field form-field-wide student-field">
            <label htmlFor="note-file">
              {hasPreviousSubmissions ? 'Ảnh bài ghi mới' : 'Ảnh bài ghi'} <span aria-hidden="true">*</span>
            </label>
            <div className="sf-upload-control student-upload-zone"><svg aria-hidden="true" width="40" height="48" viewBox="0 0 40 48" fill="none"><path d="M5 1h21l9 9v37H5zM26 1v10h9M12 20h16M12 27h16M12 34h9" stroke="currentColor" strokeWidth="1.5" /></svg><span aria-hidden="true">Chọn ảnh bài ghi</span><input
              accept="image/png,image/jpeg"
              aria-describedby={errors.file ? 'note-file-help note-file-error' : 'note-file-help'}
              aria-invalid={Boolean(errors.file)}
              id="note-file"
              disabled={isSubmitting}
              name="file"
              onChange={onFileChange}
              type="file"
            /></div>
            <p className="form-field-help student-field-help" id="note-file-help">
              Chọn file JPG, JPEG hoặc PNG, tối đa 5 MiB. File sẽ được gửi lên hệ thống.
            </p>
            {form.fileName && (
              <p className="form-field-help student-field-help student-selected-file">Đã chọn: {form.fileName}</p>
            )}
            <FieldError id="note-file-error" message={errors.file} />
          </div>
        </div>

        <div className="assignment-form-actions student-form-actions">
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

export function StudentSubmissionWorkspace({ assignment, service = submissionService }) {
  const [form, setForm] = useState({ assignmentId: assignment.id, file: null, fileName: '', fileSizeBytes: 0 })
  const [errors, setErrors] = useState({})
  const [session] = useState(() => createStudentSubmissionSession(assignment.id, service))
  const { history: historyRequest, submit: submitRequest } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  const [now, setNow] = useState(Date.now)
  const availability = getAssignmentAvailability(assignment, now)
  const submissionHistory = historyRequest.data

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    session.loadHistory()
    return () => session.deactivate()
  }, [session])

  function handleFileChange(event) {
    if (submitRequest.status === 'loading') return
    const file = event.target.files?.[0]
    setForm(current => ({ ...current, file, fileName: file?.name ?? '', fileSizeBytes: file?.size ?? 0 }))
    setErrors({})
    session.resetSubmit()
  }
  async function handleSubmit(event) {
    event.preventDefault()
    if (submitRequest.status === 'loading') return
    const currentAvailability = getAssignmentAvailability(assignment)
    setNow(Date.now())
    if (!currentAvailability.isOpen) { setErrors({ file: currentAvailability.message }); return }
    const nextErrors = validateSubmissionForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await session.submit({ file: form.file, fileName: form.fileName })
  }
  function handleSubmitAnother() {
    setForm(current => ({ ...current, fileName: '', file: null, fileSizeBytes: 0 }))
    setErrors({})
    session.resetSubmit()
  }
  return <>
    <nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/student">Tổng quan học sinh</Link><span aria-hidden="true">/</span><span>Nộp bài ghi</span></nav>
    <StudentProgress assignment={assignment} availability={availability} history={{ status: historyRequest.status, submissions: submissionHistory }} />
    <div className="student-submission-layout sf-submission-folio">
      <div className="student-submit-column">
        {submitRequest.status === 'success' ? <SubmissionSuccess assignment={assignment} canResubmit={availability.isOpen} onSubmitAnother={handleSubmitAnother} request={submitRequest} /> :
          <StudentSubmissionForm assignment={assignment} availability={availability} errors={errors} form={form} hasPreviousSubmissions={submissionHistory.length > 0} onFileChange={handleFileChange} onSubmit={handleSubmit} request={submitRequest} />}
      </div>
      <div className="student-history-column"><SubmissionHistory message={historyRequest.message} status={historyRequest.status} submissions={submissionHistory} /></div>
    </div>
  </>
}

function StudentSubmissionPage({ currentUser }) {
  const { assignment } = useOutletContext() ?? {}

  if (!assignment) {
    return <SubmissionError message="Bài kiểm tra không khả dụng." />
  }

  return (
    <main className="page-content assignment-page student-page student-submission-page">
      <div className="page-container">
        <StudentSubmissionWorkspace
          key={`${currentUser?.id ?? 'student'}:${assignment.id}`}
          assignment={assignment}
        />
      </div>
    </main>
  )
}

export default StudentSubmissionPage
