import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { formatAssignmentDeadline } from '../data/assignmentDeadline.js'
import { assignmentService } from '../services/assignmentService.js'
import { submissionService } from '../services/submissionService.js'
import { teacherClassService } from '../services/teacherClassService.js'

function mapAssignment(assignment = {}, submissionCount, studentCount = 0) {
  const statusLabels = {
    OPEN: { label: 'Đang mở', tone: 'active' },
    CLOSED: { label: 'Đã đóng', tone: 'closed' },
    DRAFT: { label: 'Bản nháp', tone: 'warning' },
  }
  const status = statusLabels[assignment.status] ?? statusLabels.DRAFT

  return {
    id: assignment.id,
    title: assignment.title ?? 'Chưa có tên',
    dueAt: assignment.due_at,
    dueDate: formatAssignmentDeadline({ dueAt: assignment.due_at }),
    threshold: `${Number(assignment.coverage_threshold ?? 0)}%`,
    submission: Number.isFinite(submissionCount)
      ? `${submissionCount}/${studentCount} học sinh đã nộp`
      : 'Chưa có dữ liệu',
    status: status.label,
    statusTone: status.tone,
  }
}

function AssignmentTable({ classId, rows }) {
  if (rows.length === 0) {
    return <div className="table-empty">Chưa có bài kiểm tra nào trong lớp này.</div>
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Tên bài kiểm tra</th>
            <th scope="col">Hạn nộp</th>
            <th scope="col">Ngưỡng đạt</th>
            <th scope="col">Tiến độ nộp bài</th>
            <th scope="col">Trạng thái</th>
            <th scope="col" className="table-action-cell">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assignment) => (
            <tr key={assignment.id}>
              <td className="table-primary-cell">{assignment.title}</td>
              <td>{assignment.dueDate}</td>
              <td>{assignment.threshold}</td>
              <td className="table-muted-cell">{assignment.submission}</td>
              <td>
                <span className={`table-status table-status-${assignment.statusTone}`}>
                  <span aria-hidden="true" />
                  {assignment.status}
                </span>
              </td>
              <td className="table-action-cell">
                <Link
                  className="table-action"
                  to={`/classes/${classId}/assignments/${assignment.id}`}
                >
                  Xem chi tiết
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentTable({ rows }) {
  if (rows.length === 0) {
    return <div className="table-empty">Chưa có dữ liệu học sinh cho lớp này.</div>
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table student-table">
        <thead>
          <tr>
            <th scope="col">STT</th>
            <th scope="col">Họ và tên</th>
            <th scope="col">Mã học sinh</th>
            <th scope="col" className="table-action-cell">
              Bài nộp gần nhất
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((student, index) => (
            <tr key={student.id ?? student.code}>
              <td className="table-muted-cell">
                {student.number ?? String(index + 1).padStart(2, '0')}
              </td>
              <td className="table-primary-cell">{student.name}</td>
              <td className="table-muted-cell">{student.code}</td>
              <td
                className={`table-action-cell ${student.latestSubmission === 'Chưa có dữ liệu' ? 'student-missing' : 'student-submitted'}`}
              >
                {student.latestSubmission}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClassDetailError({ message }) {
  return (
    <PageErrorState
      kicker="Lớp học"
      message={message}
      title="Không thể mở lớp học"
    />
  )
}

function requestedTab() {
  if (typeof window === 'undefined') {
    return 'assignments'
  }

  return new URLSearchParams(window.location.search).get('tab') === 'students'
    ? 'students'
    : 'assignments'
}

function ClassDetailPage() {
  const { classId = '10A1' } = useParams()
  const [activeTab, setActiveTab] = useState(requestedTab)
  const outletContext = useOutletContext()
  const contextClassroom = outletContext?.classroom ?? null
  const [state, setState] = useState({
    status: 'loading',
    classroom: contextClassroom,
    assignments: [],
  })

  useEffect(() => {
    let isMounted = true

    const classroomRequest = contextClassroom
      ? Promise.resolve(contextClassroom)
      : teacherClassService.getClass(classId)

    Promise.all([classroomRequest, assignmentService.listAssignments(classId)])
      .then(async ([classroom, assignments]) => {
        const rows = await Promise.all((assignments ?? []).map(async (assignment) => {
          try {
            const submissions = await submissionService.listSubmissions(assignment.id)
            return mapAssignment(assignment, submissions?.length ?? 0, classroom.studentCount)
          } catch {
            return mapAssignment(assignment)
          }
        }))

        if (isMounted) {
          setState({
            status: 'success',
            classroom,
            assignments: rows,
          })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({
            status: 'error',
            classroom: null,
            assignments: [],
            message: error?.message ?? 'Không thể tải dữ liệu lớp học.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [classId, contextClassroom])

  if (state.status === 'error') {
    return <ClassDetailError message={state.message} />
  }

  if (state.status === 'loading' || !state.classroom) {
    return (
      <main className="page-content class-detail-page">
        <div className="page-container">
          <section className="state-panel" aria-live="polite" aria-busy="true">
            <p className="state-kicker">Lớp học</p>
            <h1>Đang tải lớp học...</h1>
            <p>Đang tải danh sách bài kiểm tra và học sinh.</p>
            <span className="visually-hidden">Danh sách học sinh đang được tải</span>
          </section>
        </div>
      </main>
    )
  }

  const { classroom } = state
  const rows = activeTab === 'assignments'
    ? state.assignments
    : classroom.students ?? []

  return (
    <main className="page-content class-detail-page">
      <div className="page-container">
        <nav className="breadcrumb" aria-label="Đường dẫn trang">
          <Link to="/">Lớp học</Link>
          <span aria-hidden="true">/</span>
          <span>{classroom.name}</span>
        </nav>

        <section className="class-banner" aria-labelledby="class-title">
          <span>{classroom.subject}</span>
          <h1 id="class-title">Lớp {classroom.code || classroom.id}</h1>
          <p>
            {classroom.semester} · {classroom.schoolYear} · {classroom.studentCount} học sinh
          </p>
        </section>

        <div className="class-tabs" role="tablist" aria-label="Nội dung lớp học">
          <button
            className={`class-tab${activeTab === 'assignments' ? ' class-tab-active' : ''}`}
            id="assignments-tab"
            role="tab"
            aria-controls="class-panel"
            aria-selected={activeTab === 'assignments'}
            type="button"
            onClick={() => setActiveTab('assignments')}
          >
            Bài kiểm tra
          </button>
          <button
            className={`class-tab${activeTab === 'students' ? ' class-tab-active' : ''}`}
            id="students-tab"
            role="tab"
            aria-controls="class-panel"
            aria-selected={activeTab === 'students'}
            type="button"
            onClick={() => setActiveTab('students')}
          >
            Học sinh
          </button>
        </div>

        <section id="class-panel" className="class-panel" role="tabpanel" aria-live="polite">
          <div className="detail-section-heading">
            <div>
              <h2>
                {activeTab === 'assignments'
                  ? 'Bài kiểm tra bài ghi'
                  : `Danh sách học sinh (${classroom.studentCount})`}
              </h2>
              <p>
                {activeTab === 'assignments'
                  ? 'Theo dõi và chấm duyệt hồ sơ vở ghi viết tay của học sinh theo tiêu chí định sẵn.'
                  : `Sĩ số lớp ${classroom.code || classroom.id} ${classroom.semester.toLowerCase()} ${classroom.schoolYear.toLowerCase()}.`}
            </p>
            </div>
            {activeTab === 'assignments' && (
              <Link className="button button-primary" to={`/classes/${classroom.id}/assignments/new`}>
                Tạo bài kiểm tra
              </Link>
            )}
          </div>

          {activeTab === 'assignments' ? (
            <AssignmentTable classId={classroom.id} rows={rows} />
          ) : (
            <StudentTable rows={rows} />
          )}
        </section>
      </div>
    </main>
  )
}

export default ClassDetailPage
