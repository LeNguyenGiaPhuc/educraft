export default function TeacherPendingState({ message = 'Đang mở không gian giáo viên…', standalone = false }) {
  const content = <main className="page-content tk-teacher-pending"><section role="status" aria-live="polite" aria-busy="true">
    <h1>{message}</h1><p>Thông tin sẽ hiển thị sau khi hoàn tất kiểm tra và tải dữ liệu.</p>
    <div className="tk-pending-lines" aria-hidden="true"><span /><span /><span /></div>
  </section></main>
  return standalone ? <div className="teacher-kinetic-shell tk-pending-shell"><div className="tk-pending-brand">EduCraft</div>{content}</div> : content
}
