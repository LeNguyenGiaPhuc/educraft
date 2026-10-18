import '../../styles/teacher-class-skeleton.css'

// No class props: permission-pending UI must never expose classroom data.
function TeacherClassSkeleton() {
  return <main className="page-content tk-guard-loading">
    <div className="tk-guard-container">
      <div className="tk-guard-status" role="status" aria-live="polite">
        <h1>Đang tải lớp học…</h1>
        <p>Đang kiểm tra quyền truy cập và danh sách học sinh.</p>
      </div>
      <div aria-busy="true" aria-label="Hồ sơ lớp đang tải">
        <div className="tk-guard-placeholders" aria-hidden="true">
          <div className="tk-guard-dossier">
            <div className="tk-guard-identity"><span className="tk-guard-bar tk-guard-title" /><span className="tk-guard-bar" /></div>
            <div className="tk-guard-facts">{[0, 1, 2, 3].map(slot => <div key={slot}><span className="tk-guard-bar" /><span className="tk-guard-bar" /></div>)}</div>
          </div>
          <div className="tk-guard-folder">
            <div className="tk-guard-tabs"><span>Bài kiểm tra</span><span>Học sinh</span></div>
            <div className="tk-guard-edge" />
            <div className="tk-guard-paper">
              <div className="tk-guard-list-heading"><span className="tk-guard-bar" /><span className="tk-guard-bar" /></div>
              <div className="tk-guard-index">{[0, 1, 2, 3].map(slot => <div className="tk-guard-row" key={slot}>
                <div><span className="tk-guard-bar" /><span className="tk-guard-bar" /></div>
                <span className="tk-guard-bar" /><span className="tk-guard-bar" /><span className="tk-guard-bar" />
              </div>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
}
export default TeacherClassSkeleton
