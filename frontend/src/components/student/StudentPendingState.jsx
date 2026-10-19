function StudentPendingState({ standalone = false, message = 'Đang tải bài kiểm tra…' }) {
  const content = <main className="page-content sf-pending">
    <div className="page-container">
      <section className="sf-paper" role="status" aria-busy="true">
        <span className="sf-pending-mark" aria-hidden="true">✦</span>
        <div><span className="sf-section-kicker">Đang chuẩn bị bàn học</span><h1>{message}</h1><p>Thông tin sẽ xuất hiện sau khi kiểm tra quyền truy cập.</p></div>
        <div className="sf-skeleton" aria-hidden="true"><span /><span /><span /><span /></div>
      </section>
    </div>
  </main>
  return standalone ? <div className="student-kinetic-shell"><header className="sf-pending-brand">EduCraft</header>{content}</div> : content
}
export default StudentPendingState
