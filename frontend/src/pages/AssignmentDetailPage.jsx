import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import AiResultCard from '../components/assignment-detail/AiResultCard.jsx'
import AssignmentEditor from '../components/assignment-detail/AssignmentEditor.jsx'
import {
  ReferenceCard,
  ReferenceEditor,
  ReferenceFeedback,
} from '../components/assignment-detail/ReferenceCard.jsx'
import SubmissionList from '../components/assignment-detail/SubmissionList.jsx'
import SubmissionReviewPanel from '../components/assignment-detail/SubmissionReviewPanel.jsx'
import SubmissionEvidence from '../components/assignment-detail/SubmissionEvidence.jsx'
import { createReviewSession } from '../components/assignment-detail/reviewSession.js'
import { assignmentDetailFailure } from '../data/assignmentDetailState.js'
import '../styles/teacher-assignment-detail.css'
import PageErrorState from '../components/PageErrorState.jsx'
import { formatAssignmentDeadline } from '../data/assignmentDeadline.js'
import {
  mapTeacherSubmission,
  selectTeacherSubmission,
} from '../data/teacherSubmissionView.js'
import { assignmentService } from '../services/assignmentService.js'
import { referenceService } from '../services/referenceService.js'
import { submissionService } from '../services/submissionService.js'

export {
  AiResultCard,
  ReferenceCard,
  ReferenceEditor,
  ReferenceFeedback,
  SubmissionList,
  SubmissionReviewPanel,
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

function AssignmentDetailError({ message }) {
  return (
    <PageErrorState
      kicker="Chi tiết bài kiểm tra"
      message={message}
      title="Không thể mở bài kiểm tra"
    />
  )
}

export function AssignmentDetailWorkspace({ detail, onRefresh }) {
  const navigate = useNavigate()
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(detail.submissions[0]?.id ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteState, setDeleteState] = useState({ status: 'idle' })
  const [section, setSection] = useState('review')
  const [reviewSession] = useState(() => createReviewSession(detail.id))
  useSyncExternalStore(reviewSession.subscribeWorkspace, reviewSession.getRevision, reviewSession.getRevision)
  const displayedSubmissions = detail.submissions.map(row => {
    const entry = reviewSession.get(row.id)
    return entry?.finalized ? { ...row, status: 'approved', finalStatus: entry.form.finalStatus, feedback: entry.form.feedback } : row
  })
  const hasProtectedData = detail.references.length > 0 || detail.submissions.length > 0
  const selectedSubmission = selectTeacherSubmission(displayedSubmissions, selectedSubmissionId)
  function handleFolderKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'review' : event.key === 'End' ? 'references' : section === 'review' ? 'references' : 'review'
    setSection(next)
    document.getElementById(next === 'review' ? 'assignment-review-tab' : 'assignment-references-tab')?.focus()
  }

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
    <div className="tk-assignment-detail">
      <nav className="breadcrumb teacher-breadcrumb" aria-label="Đường dẫn trang">
        <Link to={`/classes/${detail.classroom.id}`}>{detail.classroom.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Chi tiết bài kiểm tra</span>
      </nav>

      <section className="assignment-detail-hero teacher-assignment-hero" aria-labelledby="assignment-detail-title">
        {!isEditing ? (
          <div className="teacher-assignment-hero-content">
            <div className="teacher-assignment-summary">
              <h1 id="assignment-detail-title">{detail.title}</h1>
              <div className="teacher-assignment-meta" aria-label="Thông tin bài kiểm tra">
                <span>Hạn nộp: {detail.dueDate}</span>
                <span>Ngưỡng đạt: {detail.threshold}</span>
                <span>{detail.statusLabel}</span>
                <span>{detail.submissions.length} lượt nộp đã tải</span>
              </div>
            </div>
            <div className="teacher-assignment-actions">
              <div className="teacher-assignment-action-buttons">
                <button className="button button-outline" onClick={() => setIsEditing(true)} type="button">Chỉnh sửa</button>
                <button
                  aria-describedby={hasProtectedData ? 'assignment-delete-help' : undefined}
                  className="button button-danger"
                  disabled={deleteState.status === 'loading' || hasProtectedData}
                  onClick={handleDeleteAssignment}
                  title={hasProtectedData ? 'Không thể xóa bài kiểm tra đã có bài mẫu hoặc bài nộp.' : undefined}
                  type="button"
                >
                  {deleteState.status === 'loading' ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
              {hasProtectedData && (
                <p className="form-field-help assignment-delete-help" id="assignment-delete-help" role="note">
                  Không thể xóa bài kiểm tra đã có bài mẫu hoặc bài nộp.
                </p>
              )}
              {deleteState.status === 'error' && <p className="form-field-error" role="alert">{deleteState.message}</p>}
            </div>
          </div>
        ) : (
          <AssignmentEditor
            assignment={detail}
            onCancel={() => setIsEditing(false)}
            onSaved={() => { setIsEditing(false); onRefresh() }}
          />
        )}
      </section>

      <div className="tk-detail-folders" role="tablist" aria-label="Hồ sơ bài kiểm tra">
        <button id="assignment-review-tab" role="tab" aria-selected={section === 'review'} tabIndex={section === 'review' ? 0 : -1} onKeyDown={handleFolderKey} aria-controls="assignment-review-section" type="button" onClick={() => setSection('review')}>Duyệt bài</button>
        <button id="assignment-references-tab" role="tab" aria-selected={section === 'references'} tabIndex={section === 'references' ? 0 : -1} onKeyDown={handleFolderKey} aria-controls="assignment-reference-section" type="button" onClick={() => setSection('references')}>Bài mẫu ({detail.references.length})</button>
      </div>
      <section id="assignment-reference-section" role="tabpanel" aria-labelledby="assignment-references-tab" hidden={section !== 'references'}>
        <ReferenceCard assignment={detail} onChanged={onRefresh} references={detail.references} />
      </section>
      <section id="assignment-review-section" role="tabpanel" aria-labelledby="assignment-review-tab" hidden={section !== 'review'}>
        <div className="tk-detail-review-grid">
          <section className="tk-submission-navigator" aria-labelledby="submissions-title">
            <h2 id="submissions-title">Lượt nộp</h2>
            <p>{detail.submissions.length} lượt trong dữ liệu đã tải. Chọn từng lần nộp để xem và nhận xét.</p>
            <SubmissionList onSelect={setSelectedSubmissionId} selectedId={selectedSubmission?.id} submissions={displayedSubmissions} />
          </section>
          {selectedSubmission ? <>
            <SubmissionEvidence submission={selectedSubmission} references={detail.references} />
            <SubmissionReviewPanel key={selectedSubmission.id} assignmentId={detail.id} coverageThreshold={detail.coverageThreshold} reviewSession={reviewSession} onReviewed={onRefresh} submission={selectedSubmission} />
          </> : <section className="tk-review-empty"><h2>Chưa có bài để duyệt</h2><p>Bằng chứng và hồ sơ nhận xét sẽ xuất hiện khi học sinh nộp bài.</p></section>}
        </div>
      </section>
    </div>
  )
}

function AssignmentDetailPage() {
  const { assignmentId } = useParams()
  const outletContext = useOutletContext()
  const classroom = outletContext?.classroom ?? null
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState({ status: 'loading', detail: null, assignmentId: null })

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
            assignmentId,
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
          setState(current => assignmentDetailFailure(current, assignmentId, error?.message ?? 'Không thể tải chi tiết bài kiểm tra.', error?.status))
        }
      })

    return () => { isMounted = false }
  }, [assignmentId, classroom, reloadToken])

  if (state.assignmentId === assignmentId && state.status === 'error') return <AssignmentDetailError message={state.message} />

  if (state.assignmentId !== assignmentId || state.status === 'loading' || !state.detail) {
    return (
      <main className="page-content assignment-detail-page teacher-page teacher-assignment-detail-page">
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
    <main className="page-content assignment-detail-page teacher-page teacher-assignment-detail-page">
      <div className="page-container">
        {state.refreshError && <div className="tk-detail-refresh-error" role="alert"><p>Không thể làm mới dữ liệu: {state.refreshError}. Các nhận xét đang nhập vẫn được giữ trong phiên hiện tại.</p><button type="button" onClick={() => setReloadToken(current => current + 1)}>Thử làm mới lại</button></div>}
        <AssignmentDetailWorkspace
          key={state.detail.id}
          detail={state.detail}
          onRefresh={() => setReloadToken((current) => current + 1)}
        />
      </div>
    </main>
  )
}

export default AssignmentDetailPage
