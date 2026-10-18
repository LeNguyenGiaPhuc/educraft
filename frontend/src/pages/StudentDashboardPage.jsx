import { useEffect, useState } from 'react'
import PageErrorState from '../components/PageErrorState.jsx'
import StudentLearningArchive from '../components/student/StudentLearningArchive.jsx'
import StudentPendingState from '../components/student/StudentPendingState.jsx'
import { studentService } from '../services/studentService.js'

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
  return <main className="page-content student-page sf-dashboard">
    <div className="page-container">
      <header className="sf-workspace-heading"><div><h1>Hồ sơ học tập</h1><p>{currentUser?.name} · Chọn lớp và mở bài kiểm tra để nộp bài ghi.</p></div><span>{request.data.length} lớp đã tải</span></header>
      <StudentLearningArchive classes={request.data} />
    </div>
  </main>
}
export default StudentDashboardPage
