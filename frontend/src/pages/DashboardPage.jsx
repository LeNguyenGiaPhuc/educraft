import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import ClassArchive from '../components/teacher/ClassArchive.jsx'
import { teacherClassService } from '../services/teacherClassService.js'

function DashboardHeading({ currentUser }) {
  const name = currentUser?.name || 'giáo viên'

  return (
    <section className="tk-intro" aria-labelledby="teacher-overview-title">
      <div className="tk-intro-copy">
        <p className="tk-kicker">EDUCRAFT / KHÔNG GIAN GIÁO VIÊN</p>
        <h1 id="teacher-overview-title">
          Mỗi lớp học,
          <span>một hồ sơ.</span>
        </h1>
        <p className="tk-intro-lede">
          Xin chào, {name}. Những lớp được phân công và công việc đánh giá của bạn bắt đầu từ đây.
        </p>
      </div>

      <div className="tk-intro-note">
        <span className="tk-note-line" aria-hidden="true" />
        <p className="tk-note-label">GHI CHÚ CỦA GIÁO VIÊN</p>
        <p className="tk-note-copy">Một nơi để mở hồ sơ, đọc bài nộp và giữ lại quyết định của mình.</p>
        <Link className="tk-button tk-button-primary" to="/assignments/new">
          <span>Tạo bài kiểm tra</span>
          <span className="tk-button-arrow" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

function DashboardState({ snapshot, onRetry }) {
  if (snapshot.status === 'loading') {
    return (
      <section className="tk-state tk-loading-state" aria-live="polite" aria-busy="true">
        <div className="tk-state-heading">
          <div>
            <p className="tk-kicker">ARCHIVE / ĐANG MỞ</p>
            <h2>Đang mở tủ hồ sơ</h2>
          </div>
          <span className="tk-loading-pulse" aria-hidden="true" />
        </div>
        <div className="tk-loading-paper" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    )
  }

  if (snapshot.status === 'error') {
    return (
      <section className="tk-state tk-error-state" role="alert">
        <p className="tk-kicker">ARCHIVE / KHÔNG SẴN SÀNG</p>
        <h2>Chưa thể mở danh sách lớp</h2>
        <p>{snapshot.message}</p>
        <button className="tk-button tk-button-secondary" type="button" onClick={onRetry}>
          Thử tải lại
        </button>
      </section>
    )
  }

  if (snapshot.data.length === 0) {
    return (
      <section className="tk-state tk-empty-state" aria-live="polite">
        <p className="tk-kicker">ARCHIVE / TRỐNG</p>
        <h2>Chưa có lớp học nào</h2>
        <p>Các lớp bạn phụ trách sẽ xuất hiện ở đây khi được phân công.</p>
        <Link className="tk-button tk-button-secondary" to="/assignments/new">
          Tạo bài kiểm tra
        </Link>
      </section>
    )
  }

  return <ClassArchive classes={snapshot.data} />
}

function DashboardPage({ currentUser }) {
  const [snapshot, setSnapshot] = useState({ status: 'loading', data: [] })
  const requestIdRef = useRef(0)

  const loadClasses = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setSnapshot((previous) => ({ status: 'loading', data: previous.data }))

    try {
      const data = await teacherClassService.listClasses()
      if (requestId === requestIdRef.current) {
        setSnapshot({ status: 'success', data })
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setSnapshot({
          status: 'error',
          data: [],
          message: error?.message ?? 'Không thể tải danh sách lớp.',
        })
      }
    }
  }, [])

  useEffect(() => {
    const requestId = ++requestIdRef.current

    teacherClassService
      .listClasses()
      .then((data) => {
        if (requestId === requestIdRef.current) {
          setSnapshot({ status: 'success', data })
        }
      })
      .catch((error) => {
        if (requestId === requestIdRef.current) {
          setSnapshot({
            status: 'error',
            data: [],
            message: error?.message ?? 'Không thể tải danh sách lớp.',
          })
        }
      })

    return () => {
      requestIdRef.current += 1
    }
  }, [])

  return (
    <main className="page-content teacher-page teacher-kinetic-overview">
      <div className="page-container">
        <DashboardHeading currentUser={currentUser} />
        <DashboardState onRetry={loadClasses} snapshot={snapshot} />
      </div>
    </main>
  )
}

export default DashboardPage
