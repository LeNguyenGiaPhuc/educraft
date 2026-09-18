import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { teacherClassService } from '../services/teacherClassService.js'

function DashboardHeading({ currentUser }) {
  const name = currentUser?.name || 'giáo viên'

  return (
    <div className="dashboard-heading teacher-page-heading">
      <div>
        <h1>Xin chào, {name}</h1>
        <p>Theo dõi các lớp được phân công và quản lý bài kiểm tra bài ghi tại một nơi.</p>
      </div>
      <div className="dashboard-actions teacher-page-actions">
        <Link className="button button-primary" to="/assignments/new">
          Tạo bài kiểm tra
        </Link>
      </div>
    </div>
  )
}

function DashboardState({ snapshot, onRetry }) {
  if (snapshot.status === 'loading') {
    return (
      <section className="class-section teacher-state-section" aria-live="polite" aria-busy="true">
        <div className="section-heading">
          <h2>Lớp học được phân công</h2>
          <span>Đang tải dữ liệu...</span>
        </div>
        <div className="class-grid class-grid-loading teacher-class-grid">
          <div className="class-skeleton" />
          <div className="class-skeleton" />
          <div className="class-skeleton" />
        </div>
      </section>
    )
  }

  if (snapshot.status === 'error') {
    return (
      <section className="state-panel state-panel-error teacher-state-panel" role="alert">
        <p className="state-kicker">Không thể tải dữ liệu</p>
        <h2>Danh sách lớp chưa sẵn sàng</h2>
        <p>{snapshot.message}</p>
        <button
          className="button button-outline"
          type="button"
          onClick={onRetry}
        >
          Thử lại
        </button>
      </section>
    )
  }

  if (snapshot.data.length === 0) {
    return (
      <section className="state-panel teacher-state-panel" aria-live="polite">
        <p className="state-kicker">Chưa có dữ liệu</p>
        <h2>Chưa có lớp học nào</h2>
        <p>Các lớp bạn phụ trách sẽ xuất hiện ở đây.</p>
      </section>
    )
  }

  return (
    <section className="class-section teacher-state-section">
      <div className="section-heading teacher-section-heading">
        <h2>Lớp học được phân công</h2>
        <span>
          {snapshot.data[0]?.semester || 'Các lớp đang phụ trách'}
          {snapshot.data[0]?.schoolYear ? ` · ${snapshot.data[0].schoolYear}` : ''}
        </span>
      </div>

      <div className="class-grid teacher-class-grid">
        {snapshot.data.map((classroom, index) => (
          <Link
            className={`class-card teacher-class-card class-card-accent-${classroom.accent ?? ['blue', 'green', 'orange', 'purple'][index % 4]}`}
            key={classroom.id}
            to={`/classes/${classroom.id}`}
          >
            <div className="class-card-body">
              <div className="class-card-meta teacher-class-card-meta">
                <span className="class-code teacher-class-code">{classroom.code || classroom.id}</span>
                <span className="class-status teacher-class-status">
                  <span aria-hidden="true" />
                  {classroom.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}
                </span>
              </div>
              <h3>{classroom.name}</h3>
              <p>
                {classroom.semester} · {classroom.schoolYear}
              </p>
              <div className="class-card-footer teacher-class-card-footer">
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

function DashboardPage({ currentUser }) {
  const [snapshot, setSnapshot] = useState({ status: 'loading', data: [] })

  async function loadClasses() {
    try {
      const data = await teacherClassService.listClasses()
      setSnapshot({ status: 'success', data })
    } catch (error) {
      setSnapshot({
        status: 'error',
        data: [],
        message: error?.message ?? 'Không thể tải danh sách lớp.',
      })
    }
  }

  useEffect(() => {
    let isMounted = true

    teacherClassService
      .listClasses()
      .then((data) => {
        if (isMounted) {
          setSnapshot({ status: 'success', data })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSnapshot({
            status: 'error',
            data: [],
            message: error?.message ?? 'Không thể tải danh sách lớp.',
          })
        }
      })

    return () => { isMounted = false }
  }, [])

  return (
    <main className="page-content teacher-page teacher-dashboard-page">
      <div className="page-container">
        <DashboardHeading currentUser={currentUser} />
        <DashboardState onRetry={loadClasses} snapshot={snapshot} />
      </div>
    </main>
  )
}

export default DashboardPage
