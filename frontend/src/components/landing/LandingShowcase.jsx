import { memo, useState } from 'react'

import '../../styles/landing-dossier.css'

const STAGES = [
  { id: 'brief', number: '01', label: 'Giao bài' },
  { id: 'submission', number: '02', label: 'Nộp bài' },
  { id: 'review', number: '03', label: 'Phản hồi' },
]

function DossierStage() {
  const [activeStage, setActiveStage] = useState('brief')
  const activeLabel = STAGES.find((stage) => stage.id === activeStage)?.label

  return (
    <div className="dossier-stage" data-active-stage={activeStage}>
      <div className="dossier-stage-index">
        <span className="dossier-stage-caption">Hồ sơ minh họa · EC / 001</span>
        <span className="dossier-stage-count">01 — 03</span>
      </div>

      <ol className="dossier-stage-tabs" aria-label="Các bước trong hành trình bài ghi">
        {STAGES.map((stage) => (
          <li key={stage.id}>
            <button
              aria-controls="dossier-paper-stack"
              aria-pressed={activeStage === stage.id}
              className="dossier-stage-tab"
              onClick={() => setActiveStage(stage.id)}
              type="button"
            >
              <span>{stage.number}</span>
              <strong>{stage.label}</strong>
            </button>
          </li>
        ))}
      </ol>

      <div className="dossier-paper-stack" id="dossier-paper-stack">
        <div className="dossier-registration dossier-registration--top" aria-hidden="true" />
        <div className="dossier-registration dossier-registration--bottom" aria-hidden="true" />

        <article aria-hidden={activeStage !== 'brief'} className="dossier-sheet dossier-sheet--brief">
          <div className="dossier-sheet-tab">Bản giao</div>
          <div className="dossier-sheet-head">
            <span>Giáo viên / Bài kiểm tra</span>
            <span>EC—01</span>
          </div>
          <div className="dossier-sheet-body">
            <span className="dossier-sheet-index">01 / GIAO BÀI</span>
            <h2>Bài kiểm tra<br />đang mở</h2>
            <p>Giáo viên chuẩn bị ảnh bài mẫu và các ý chính để đối chiếu với bài ghi được nộp.</p>
            <div className="dossier-sheet-rule" />
            <div className="dossier-sheet-facts">
              <span>Ảnh bài mẫu</span>
              <strong>Đã chuẩn bị</strong>
            </div>
            <div className="dossier-sheet-facts">
              <span>Trạng thái</span>
              <strong>Đang nhận bài</strong>
            </div>
          </div>
          <div className="dossier-sheet-foot"><span>Hồ sơ học tập</span><span>01 / 03</span></div>
        </article>

        <article aria-hidden={activeStage !== 'submission'} className="dossier-sheet dossier-sheet--submission">
          <div className="dossier-sheet-tab">Phiếu nộp</div>
          <div className="dossier-sheet-head">
            <span>Học sinh / Lượt nộp</span>
            <span>EC—02</span>
          </div>
          <div className="dossier-sheet-body">
            <span className="dossier-sheet-index">02 / NỘP BÀI</span>
            <h2>Bài ghi trở thành<br />một bản lưu.</h2>
            <div className="dossier-file-slip">
              <div className="dossier-file-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>anh-bai-ghi.jpg</strong>
                <span>Ảnh bài ghi · JPG / PNG</span>
              </div>
              <b>01</b>
            </div>
            <p>Mỗi lượt nộp được lưu riêng để học sinh theo dõi lịch sử và kết quả sau khi giáo viên chốt.</p>
          </div>
          <div className="dossier-sheet-foot"><span>Hồ sơ học tập</span><span>02 / 03</span></div>
        </article>

        <article aria-hidden={activeStage !== 'review'} className="dossier-sheet dossier-sheet--review">
          <div className="dossier-sheet-tab">Ghi chú</div>
          <div className="dossier-sheet-head">
            <span>Giáo viên / Phản hồi</span>
            <span>EC—03</span>
          </div>
          <div className="dossier-sheet-body">
            <span className="dossier-sheet-index">03 / PHẢN HỒI</span>
            <h2>Một nhận xét.<br />Một bước tiếp.</h2>
            <div className="dossier-annotation">
              <span>Ghi chú minh họa</span>
              <p>“Đã trình bày đủ các ý chính. Hãy làm rõ hơn phần kết luận.”</p>
            </div>
            <div className="dossier-review-decision">
              <span>Gợi ý chỉ để tham khảo</span>
              <strong>Giáo viên chốt kết quả cuối cùng.</strong>
            </div>
          </div>
          <div className="dossier-sheet-foot"><span>Hồ sơ học tập</span><span>03 / 03</span></div>
        </article>

        <span className="dossier-connector" aria-hidden="true" />
      </div>
      <p className="dossier-stage-status" role="status">Đang xem: {activeLabel} <span aria-hidden="true">↗</span></p>
    </div>
  )
}

function LandingShowcase({ loginButtonRef, onOpenLogin }) {
  return (
    <section aria-label="Giới thiệu EduCraft" className="living-dossier">
      <header className="living-dossier-header">
        <div className="living-dossier-brand">
          <span aria-hidden="true" className="living-dossier-brand-mark">E</span>
          <strong>EduCraft</strong>
          <span className="living-dossier-brand-note">Hồ sơ học tập</span>
        </div>
        <button className="living-dossier-header-login" onClick={onOpenLogin} ref={loginButtonRef} type="button">
          Đăng nhập <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="living-dossier-main">
        <div className="living-dossier-statement">
          <div className="living-dossier-statement-inner">
            <h1 aria-label="Mỗi bài ghi. Một hành trình.">
              <span className="living-dossier-title-start">Mỗi</span>
              <span className="living-dossier-title-middle">bài ghi.</span>
              <span className="living-dossier-title-route">
                <span className="living-dossier-title-turn">Một</span>
                <span className="living-dossier-title-end">hành trình.</span>
              </span>
            </h1>
            <p>
              Từ bài kiểm tra được giao, ảnh bài ghi được nộp đến phản hồi cuối cùng của giáo viên —
              EduCraft giữ từng bước trong một hồ sơ rõ ràng.
            </p>
            <button className="living-dossier-primary" onClick={onOpenLogin} type="button">
              <span>Trải nghiệm EduCraft</span>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="square" strokeWidth="1.8" />
              </svg>
            </button>
          </div>
          <div className="living-dossier-side-note" aria-hidden="true">TỪ TRANG GIẤY / ĐẾN PHẢN HỒI</div>
        </div>

        <DossierStage />
      </div>

      <div className="living-dossier-footer" aria-label="Ba vai trò của EduCraft">
        <span className="living-dossier-footer-intro">Cùng một hành trình, ba vai trò</span>
        <div><span>01 / Quản trị</span><strong>Vận hành lớp học</strong></div>
        <div><span>02 / Giáo viên</span><strong>Giao bài &amp; chốt kết quả</strong></div>
        <div><span>03 / Học sinh</span><strong>Nộp bài &amp; nhận phản hồi</strong></div>
      </div>
    </section>
  )
}

export default memo(LandingShowcase)
