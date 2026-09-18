import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { formatAssignmentDeadline } from '../data/assignmentDeadline.js'
import { studentService } from '../services/studentService.js'

function StudentActivityCard({ assignment }) {
  return (
    <Link
      className="class-card student-assignment-card"
      to={`/student/assignments/${encodeURIComponent(assignment.id)}`}
    >
      <div className="class-card-body">
        <div className="class-card-meta student-assignment-meta">
          <span className="class-code student-class-code">{assignment.classCode ?? assignment.classId}</span>
          {assignment.status && (
            <span className={`table-status table-status-${assignment.statusTone} student-assignment-status`}>
              <span aria-hidden="true" />
              {assignment.statusLabel ?? assignment.status}
            </span>
          )}
        </div>
        <h3 className="student-assignment-title">{assignment.title}</h3>
        <p className="student-assignment-class">{assignment.className}</p>
        <div className="class-card-footer student-assignment-footer">
          <span>Hạn nộp: {formatAssignmentDeadline(assignment)}</span>
        </div>
      </div>
    </Link>
  )
}

function StudentClassSection({ classroom }) {
  const headingId = `student-class-${classroom.id}`

  return (
    <section className="class-section student-class-section" aria-labelledby={headingId}>
      <div className="detail-section-heading student-class-heading">
        <div>
          <h2 id={headingId}>{classroom.name}</h2>
          <p>{classroom.semester} · {classroom.schoolYear}</p>
        </div>
        <span className="student-assignment-count">
          {classroom.assignments.length} bài kiểm tra
        </span>
      </div>
      {classroom.assignments.length === 0 ? (
        <div className="table-empty student-empty-state">Chưa có bài kiểm tra nào trong lớp này.</div>
      ) : (
        <div className="class-grid student-assignment-grid">
          {classroom.assignments.map((assignment) => (
            <StudentActivityCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </section>
  )
}

function StudentDashboardPage({ currentUser }) {
  const [request, setRequest] = useState({ status: 'loading', data: [] })

  useEffect(() => {
    let isMounted = true

    studentService
      .getDashboard()
      .then((data) => {
        if (isMounted) setRequest({ status: 'success', data })
      })
      .catch((error) => {
        if (isMounted) {
          setRequest({
            status: 'error',
            data: [],
            message: error.message ?? 'Không thể tải lớp học của học sinh.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (request.status === 'loading') {
    return (
      <main className="page-content student-page student-dashboard-page">
        <div className="page-container">
          <section className="state-panel student-state-panel" role="status" aria-busy="true">
            <h1>Đang tải lớp học...</h1>
          </section>
        </div>
      </main>
    )
  }

  if (request.status === 'error') {
    return (
      <PageErrorState
        kicker="Góc học sinh"
        title="Không thể mở tổng quan"
        message={request.message}
      />
    )
  }

  return (
    <main className="page-content student-page student-dashboard-page">
      <div className="page-container">
        <div className="dashboard-heading student-dashboard-heading">
          <div>
            <h1>Xin chào, {currentUser.name}</h1>
            <p>Xem lớp học và các bài kiểm tra bài ghi của bạn.</p>
          </div>
        </div>
        {request.data.length === 0 ? (
          <section className="state-panel student-state-panel" aria-live="polite">
            <h2>Chưa có lớp học nào</h2>
            <p>Các lớp bạn tham gia sẽ xuất hiện ở đây.</p>
          </section>
        ) : (
          request.data.map((classroom) => (
            <StudentClassSection key={classroom.id} classroom={classroom} />
          ))
        )}
      </div>
    </main>
  )
}

export default StudentDashboardPage
