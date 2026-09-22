import { useEffect, useState } from 'react'
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
      <nav className="breadcrumb teacher-breadcrumb" aria-label="Đường dẫn trang">
        <Link to={`/classes/${detail.classroom.id}`}>{detail.classroom.name}</Link>
        <span aria-hidden="true">/</span>
        <span>Chi tiết bài kiểm tra</span>
      </nav>

      <section className="assignment-detail-hero teacher-assignment-hero" aria-labelledby="assignment-detail-title">
        {!isEditing ? (
          <>
            <div className="teacher-assignment-summary">
              <p className="state-kicker">Bài kiểm tra bài ghi</p>
              <h1 id="assignment-detail-title">{detail.title}</h1>
              <p>{detail.dueDate} · Ngưỡng đạt {detail.threshold} · {detail.submissions.length} bài nộp</p>
            </div>
            <div className="assignment-form-actions teacher-form-actions teacher-assignment-actions">
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

      <div className="assignment-detail-grid teacher-assignment-grid">
        <ReferenceCard assignment={detail} onChanged={onRefresh} references={detail.references} />

        <section className="assignment-detail-card teacher-detail-card teacher-submissions-card" aria-labelledby="submissions-title">
          <div className="assignment-detail-card-heading teacher-detail-card-heading">
            <div>
              <p className="state-kicker">Theo dõi tiến độ</p>
              <h2 id="submissions-title">Bài nộp của học sinh</h2>
            </div>
            <span className="detail-card-label teacher-count-label">{detail.submissions.length} bài nộp</span>
          </div>
          <p className="assignment-detail-card-description">
            Chọn một bài nộp để xem gợi ý AI và chốt trạng thái cuối cùng.
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
        <AssignmentDetailWorkspace
          detail={state.detail}
          onRefresh={() => setReloadToken((current) => current + 1)}
        />
      </div>
    </main>
  )
}

export default AssignmentDetailPage
