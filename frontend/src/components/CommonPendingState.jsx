export default function CommonPendingState({ message = 'Đang mở không gian làm việc…' }) {
  return (
    <main className="kf-common-page">
      <div className="kf-common-brand"><span aria-hidden="true">E</span>EduCraft</div>
      <section className="kf-common-paper" role="status" aria-busy="true">
        <h1>{message}</h1>
        <p>Thông tin sẽ hiển thị sau khi hoàn tất kiểm tra và tải dữ liệu.</p>
        <div className="kf-common-skeleton" aria-hidden="true"><span /><span /><span /></div>
      </section>
    </main>
  )
}
