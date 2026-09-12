import { useState } from 'react'
import { Link } from 'react-router-dom'

import ClassManagementPanel from '../components/ClassManagementPanel.jsx'
import { getDashboardSnapshot } from '../data/mockDashboard.js'

function requestedDashboardState() {
  if (typeof window === 'undefined') {
    return 'success'
  }

  return new URLSearchParams(window.location.search).get('state') ?? 'success'
}

function DashboardHeading({ manageOpen, onManage }) {
  return (
    <div className="dashboard-heading">
      <div>
        <h1>Chào buổi tối, thầy Phúc</h1>
        <p>Quản lý các lớp và bài kiểm tra bài ghi tại một nơi.</p>
      </div>
      <div className="dashboard-actions">
        <button className="button button-outline" type="button" onClick={onManage}>
          {manageOpen ? 'Đóng quản lý' : 'Quản lý lớp'}
        </button>
        <Link className="button button-primary" to="/assignments/new">
          Tạo bài kiểm tra
        </Link>
      </div>
    </div>
  )
}

function DashboardState({ snapshot }) {
  if (snapshot.status === 'loading') {
    return (
      <section className="class-section" aria-live="polite" aria-busy="true">
        <div className="section-heading">
          <h2>Danh sách lớp giảng dạy</h2>
          <span>Đang tải dữ liệu...</span>
        </div>
        <div className="class-grid class-grid-loading">
          <div className="class-skeleton" />
          <div className="class-skeleton" />
          <div className="class-skeleton" />
        </div>
      </section>
    )
  }

  if (snapshot.status === 'error') {
    return (
      <section className="state-panel state-panel-error" role="alert">
        <p className="state-kicker">Không thể tải dữ liệu</p>
        <h2>Danh sách lớp chưa sẵn sàng</h2>
        <p>{snapshot.message}</p>
        <button
          className="button button-outline"
          type="button"
          onClick={() => {
            window.location.href = '/'
          }}
        >
          Thử lại
        </button>
      </section>
    )
  }

  if (snapshot.data.length === 0) {
    return (
      <section className="state-panel" aria-live="polite">
        <p className="state-kicker">Chưa có dữ liệu</p>
        <h2>Chưa có lớp học nào</h2>
        <p>Các lớp bạn phụ trách sẽ xuất hiện ở đây.</p>
      </section>
    )
  }

  return (
    <section className="class-section">
      <div className="section-heading">
        <h2>Danh sách lớp giảng dạy</h2>
        <span>Học kỳ 1 · 2026–2027</span>
      </div>

      <div className="class-grid">
        {snapshot.data.map((classroom) => (
          <Link
            className={`class-card class-card-accent-${classroom.accent}`}
            key={classroom.id}
            to={`/classes/${classroom.id}`}
          >
            <div className="class-card-body">
              <div className="class-card-meta">
                <span className="class-code">{classroom.id}</span>
                <span className="class-status">
                  <span aria-hidden="true" />
                  Đang hoạt động
                </span>
              </div>
              <h3>{classroom.name}</h3>
              <p>
                {classroom.semester} · {classroom.schoolYear}
              </p>
              <div className="class-card-footer">
                <span>{classroom.studentCount} học sinh</span>
                <span>{classroom.assignmentCount} bài kiểm tra</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function DashboardPage() {
  const [snapshot, setSnapshot] = useState(() => getDashboardSnapshot(requestedDashboardState()))
  const [manageOpen, setManageOpen] = useState(false)

  function refreshSnapshot() {
    setSnapshot(getDashboardSnapshot(requestedDashboardState()))
  }

  return (
    <main className="page-content">
      <div className="page-container">
        <DashboardHeading
          manageOpen={manageOpen}
          onManage={() => setManageOpen((current) => !current)}
        />
        {manageOpen && snapshot.status === 'success' && (
          <ClassManagementPanel classes={snapshot.data} onChanged={refreshSnapshot} />
        )}
        <DashboardState snapshot={snapshot} />
      </div>
    </main>
  )
}

export default DashboardPage
