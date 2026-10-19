import { useEffect, useState } from 'react'
import PageErrorState from '../components/PageErrorState.jsx'
import StudentLearningArchive from '../components/student/StudentLearningArchive.jsx'
import StudentPendingState from '../components/student/StudentPendingState.jsx'
import { getAssignmentAvailability } from '../data/assignmentDeadline.js'
import { studentService } from '../services/studentService.js'

function getPreferredName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  return parts.at(-1) ?? 'bạn'
}

function StudentDashboardPage({ currentUser }) {
  const [request, setRequest] = useState({ status: 'loading', data: [] })
  useEffect(() => {
    let isMounted = true
    studentService.getDashboard()
      .then(data => { if (isMounted) setRequest({ status: 'success', data }) })
      .catch(error => { if (isMounted) setRequest({ status: 'error', data: [], message: error.message ?? 'Không thể tải lớp học của học sinh.' }) })
    return () => { isMounted = false }
  }, [])

  if (request.status === 'loading') return <StudentPendingState message="Đang tải lớp học…" />
  if (request.status === 'error') return <PageErrorState title="Không thể mở tổng quan" message={request.message} />

  const openAssignmentCount = request.data.reduce((count, classroom) => (
    count + classroom.assignments.filter((assignment) => getAssignmentAvailability(assignment).isOpen).length
  ), 0)

  return (
    <main className="page-content student-page sf-dashboard campus-studio-page campus-studio-student-dashboard">
      <div className="page-container">
        <header className="cs-student-welcome">
          <div className="cs-student-welcome-copy">
            <span className="sf-section-kicker">Không gian học tập</span>
            <h1>Chào {getPreferredName(currentUser?.name)}, hôm nay mình tiếp tục nhé?</h1>
            <p>Mở bài đang chờ bạn hoặc khám phá từng lớp trong Campus Board.</p>
          </div>
          <dl className="cs-student-snapshot" aria-label="Tổng quan dữ liệu đã tải">
            <div><dt>Lớp của bạn</dt><dd>{request.data.length}</dd></div>
            <div><dt>Bài đang mở</dt><dd>{openAssignmentCount}</dd></div>
          </dl>
          <div className="cs-campus-visual" aria-hidden="true">
            <span className="cs-campus-sun" />
            <span className="cs-campus-notebook"><i /><i /><i /></span>
            <span className="cs-campus-assignment-sheet"><i /><i /><i /></span>
            <span className="cs-campus-pencil" />
            <span className="cs-campus-sticky-note"><i /><i /></span>
            <span className="cs-campus-tab cs-campus-tab-mint">Môn học</span>
            <span className="cs-campus-tab cs-campus-tab-yellow">Bài ghi</span>
          </div>
        </header>
        <StudentLearningArchive classes={request.data} />
      </div>
    </main>
  )
}
export default StudentDashboardPage
