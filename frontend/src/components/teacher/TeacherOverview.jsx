import { Link } from 'react-router-dom'
import ClassArchive from './ClassArchive.jsx'

/** One presentation for the authenticated page and the isolated QA fixture. */
function TeacherOverview({ snapshot, onRetry }) {
  return (
    <main className="page-content teacher-page teacher-kinetic-overview">
      <div className="page-container">
        <div className="tk-workspace-heading">
          <div><h1>Lớp được phân công</h1><p>Mở hồ sơ lớp để quản lý bài kiểm tra và xem bài nộp.</p></div>
          <Link className="tk-button tk-button-primary" to="/assignments/new">
            <span>Tạo bài kiểm tra</span><span className="tk-button-arrow" aria-hidden="true" />
          </Link>
        </div>
        {snapshot.status === 'loading' ? (
          <section className="tk-state tk-loading-state" aria-busy="true" aria-live="polite">
            <h2>Đang mở tủ hồ sơ</h2><p>Đang tải các lớp được phân công.</p>
            <div className="tk-loading-paper" aria-hidden="true"><span /><span /><span /></div>
          </section>
        ) : snapshot.status === 'error' ? (
          <section className="tk-state tk-error-state" role="alert">
            <h2>Chưa thể mở danh sách lớp</h2><p>{snapshot.message}</p>
            <button className="tk-button tk-button-secondary" type="button" onClick={onRetry}>Thử tải lại</button>
          </section>
        ) : snapshot.data.length === 0 ? (
          <section className="tk-state tk-empty-state" aria-live="polite">
            <span className="tk-empty-folder" aria-hidden="true" />
            <h2>Chưa có lớp học nào</h2><p>Các lớp bạn phụ trách sẽ xuất hiện ở đây khi được phân công.</p>
          </section>
        ) : <ClassArchive classes={snapshot.data} />}
      </div>
    </main>
  )
}
export default TeacherOverview
