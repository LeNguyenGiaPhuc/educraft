import { Link } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import { getStudentDashboardSnapshot } from '../data/mockStudentDashboard.js'

function StudentActivityCard({ assignment }) {
  return (
    <Link
      className="class-card"
      to={`/student/assignments/${encodeURIComponent(assignment.id)}`}
    >
      <div className="class-card-body">
        <div className="class-card-meta">
          <span className="class-code">{assignment.classId}</span>
          {assignment.status && (
            <span className={`table-status table-status-${assignment.statusTone}`}>
              <span aria-hidden="true" />
              {assignment.status}
            </span>
          )}
        </div>
        <h3>{assignment.title}</h3>
        <p>{assignment.className}</p>
        <div className="class-card-footer">
          <span>Hạn nộp: {assignment.dueDate || 'Chưa có hạn nộp'}</span>
        </div>
      </div>
    </Link>
  )
}

function StudentClassSection({ classroom }) {
  const headingId = `student-class-${classroom.id}`

  return (
    <section className="class-section" aria-labelledby={headingId}>
      <div className="detail-section-heading">
        <div>
          <h2 id={headingId}>{classroom.name}</h2>
          <p>{classroom.semester} · {classroom.schoolYear}</p>
        </div>
      </div>
      {classroom.assignments.length === 0 ? (
        <div className="table-empty">Chưa có bài kiểm tra nào trong lớp này.</div>
      ) : (
        <div className="class-grid">
          {classroom.assignments.map((assignment) => (
            <StudentActivityCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </section>
  )
}

function StudentDashboardPage({ currentUser }) {
  const snapshot = getStudentDashboardSnapshot(currentUser)

  if (snapshot.status === 'error') {
    return (
      <PageErrorState
        kicker="Góc học sinh"
        title="Không thể mở tổng quan"
        message={snapshot.message}
      />
    )
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <div className="dashboard-heading">
          <div>
            <h1>Xin chào, {currentUser.name}</h1>
            <p>Xem lớp học và các bài kiểm tra bài ghi của bạn.</p>
          </div>
        </div>
        {snapshot.data.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <h2>Chưa có lớp học nào</h2>
            <p>Các lớp bạn tham gia sẽ xuất hiện ở đây.</p>
          </section>
        ) : (
          snapshot.data.map((classroom) => (
            <StudentClassSection key={classroom.id} classroom={classroom} />
          ))
        )}
      </div>
    </main>
  )
}

export default StudentDashboardPage
