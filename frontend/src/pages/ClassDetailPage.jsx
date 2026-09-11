import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PageErrorState from '../components/PageErrorState.jsx'
import {
  getClassDetailSnapshot,
  getClassTabView,
} from '../data/mockClassDetail.js'

function AssignmentTable({ rows }) {
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
                  to={`/student/assignments/${assignment.id}`}
                >
                  Nộp bài mẫu
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
          {rows.map((student) => (
            <tr key={student.code}>
              <td className="table-muted-cell">{student.number}</td>
              <td className="table-primary-cell">{student.name}</td>
              <td className="table-muted-cell">{student.code}</td>
              <td
                className={`table-action-cell ${student.statusTone === 'warning' ? 'student-missing' : 'student-submitted'}`}
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

function ClassDetailPage() {
  const { classId = '10A1' } = useParams()
  const [activeTab, setActiveTab] = useState('assignments')
  const snapshot = getClassDetailSnapshot(classId)

  if (snapshot.status === 'error') {
    return <ClassDetailError message={snapshot.message} />
  }

  const { data: classroom } = snapshot
  const tabView = getClassTabView(classroom, activeTab)

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
          <h1 id="class-title">Lớp {classroom.id}</h1>
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
                {tabView.kind === 'assignments'
                  ? 'Bài kiểm tra bài ghi'
                  : `Danh sách học sinh (${classroom.studentCount})`}
              </h2>
              <p>
                {tabView.kind === 'assignments'
                  ? 'Theo dõi và chấm duyệt hồ sơ vở ghi viết tay của học sinh theo tiêu chí định sẵn.'
                  : `Sĩ số lớp ${classroom.id} ${classroom.semester.toLowerCase()} ${classroom.schoolYear.toLowerCase()}.`}
              </p>
            </div>
            {tabView.kind === 'assignments' && (
              <Link className="button button-primary" to={`/classes/${classroom.id}/assignments/new`}>
                Tạo bài kiểm tra
              </Link>
            )}
          </div>

          {tabView.kind === 'assignments' ? (
            <AssignmentTable rows={tabView.rows} />
          ) : (
            <StudentTable rows={tabView.rows} />
          )}
        </section>
      </div>
    </main>
  )
}

export default ClassDetailPage
