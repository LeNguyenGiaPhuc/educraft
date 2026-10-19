import { Link } from 'react-router-dom'
import ClassArchive from './ClassArchive.jsx'
import '../../styles/teacher-campus-board.css'

/** One presentation for the authenticated page and the isolated QA fixture. */
function TeacherOverview({ snapshot, onRetry }) {
  return (
    <main className="page-content teacher-page teacher-kinetic-overview campus-studio-page campus-studio-teacher-dashboard">
      <div className="page-container">
        <header className="cs-teacher-page-heading">
          <div>
            <span>Campus Studio · Giáo viên</span>
            <h1>Lớp được phân công</h1>
            <p>Mở lớp để xem học sinh, quản lý bài kiểm tra và duyệt từng lượt nộp.</p>
          </div>
          <div className="cs-teacher-hero-side">
            <span className="cs-teacher-page-status" aria-live="polite">
              {snapshot.status === 'success' ? `${snapshot.data.length} lớp trong không gian làm việc` : 'Đang cập nhật danh sách lớp'}
            </span>
            <div className="cs-teacher-planner" aria-hidden="true">
              <span><i /><i /><i /></span>
              <b /><b />
            </div>
          </div>
        </header>

        <div className="cs-teacher-bento">
          <div className="cs-teacher-main-panel">
            {snapshot.status === 'loading' ? (
              <section className="cs-teacher-state" aria-busy="true" aria-live="polite">
                <span className="cs-state-lines" aria-hidden="true"><i /><i /><i /></span>
                <h2>Đang mở bảng lớp</h2><p>Đang tải các lớp được phân công.</p>
              </section>
            ) : snapshot.status === 'error' ? (
              <section className="cs-teacher-state is-error" role="alert">
                <h2>Chưa thể mở danh sách lớp</h2><p>{snapshot.message}</p>
                <button type="button" onClick={onRetry}>Thử tải lại</button>
              </section>
            ) : snapshot.data.length === 0 ? (
              <section className="cs-class-command-board cs-teacher-state is-empty" aria-live="polite">
                <span className="cs-empty-board" aria-hidden="true" />
                <h2>Chưa có lớp học nào</h2><p>Các lớp bạn phụ trách sẽ xuất hiện ở đây khi được phân công.</p>
              </section>
            ) : <ClassArchive classes={snapshot.data} />}
          </div>

          <aside className="cs-teacher-command-rail" aria-label="Hành động và tổng quan lớp học">
            <section className="cs-create-assignment-block">
              <span>Hành động chính</span>
              <h2>Tạo bài kiểm tra</h2>
              <p>Chuẩn bị hoạt động kiểm tra bài ghi cho một lớp bạn phụ trách.</p>
              <Link to="/assignments/new">Bắt đầu <span aria-hidden="true">→</span></Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
export default TeacherOverview
