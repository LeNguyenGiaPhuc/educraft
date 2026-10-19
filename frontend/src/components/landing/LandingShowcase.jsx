import { memo, useState } from 'react'

import '../../styles/landing-dossier.css'

const STAGES = [
  {
    id: 'brief',
    number: '01',
    label: 'Giao bài',
    eyebrow: 'Giáo viên · Khởi tạo',
    title: 'Mục tiêu học tập bắt đầu thật rõ ràng.',
    description: 'Giáo viên tạo hoạt động, đặt hạn nộp và chuẩn bị bài mẫu để học sinh biết mình cần hoàn thành điều gì.',
    note: 'Bài mẫu & ý chính',
    status: 'Sẵn sàng giao bài',
  },
  {
    id: 'submission',
    number: '02',
    label: 'Nộp bài',
    eyebrow: 'Học sinh · Lượt nộp',
    title: 'Mỗi trang ghi chép đều có một hành trình.',
    description: 'Học sinh gửi ảnh bài ghi và có thể theo dõi từng lượt nộp trong lịch sử của riêng mình.',
    note: 'Ảnh bài ghi',
    status: 'Lưu theo từng lượt',
  },
  {
    id: 'analysis',
    number: '03',
    label: 'AI hỗ trợ phân tích',
    eyebrow: 'AI · Bản gợi ý',
    title: 'Nội dung được đối chiếu để hỗ trợ giáo viên.',
    description: 'AI hỗ trợ phân tích, không tự động chấm điểm. Kết quả phân tích chỉ là thông tin tham khảo trong bước xem xét.',
    note: 'Phân tích hỗ trợ',
    status: 'Không tự động quyết định',
  },
  {
    id: 'review',
    number: '04',
    label: 'Giáo viên xem xét',
    eyebrow: 'Giáo viên · Kiểm tra',
    title: 'Con người đọc lại trước khi có kết quả.',
    description: 'Giáo viên đối chiếu bài nộp, bài mẫu và gợi ý phân tích trước khi đưa ra nhận xét phù hợp.',
    note: 'Đối chiếu nội dung',
    status: 'Giáo viên kiểm tra',
  },
  {
    id: 'feedback',
    number: '05',
    label: 'Phản hồi cuối',
    eyebrow: 'Kết quả · Đã chốt',
    title: 'Phản hồi rõ ràng mở ra bước học tiếp theo.',
    description: 'Giáo viên là người đưa ra quyết định cuối cùng. Học sinh chỉ xem điểm và phản hồi sau khi kết quả được chốt.',
    note: 'Phản hồi của giáo viên',
    status: 'Hiển thị sau khi chốt',
  },
]

function StageSymbol({ stage }) {
  if (stage === 'brief') {
    return <path d="M7 4.5h10v15H7zM9.5 8h5M9.5 11h5M9.5 14h3" />
  }

  if (stage === 'submission') {
    return <path d="M12 16V5m0 0L8.5 8.5M12 5l3.5 3.5M6 14v4.5h12V14" />
  }

  if (stage === 'analysis') {
    return <path d="M12 3.5l1.4 4.1 4.1 1.4-4.1 1.4-1.4 4.1-1.4-4.1L6.5 9l4.1-1.4L12 3.5ZM18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
  }

  if (stage === 'review') {
    return <path d="M5 5.5h9v13H5zM8 9h3M8 12h3M15.5 14.5l1.4 1.4 3.1-3.4" />
  }

  return <path d="M5 12.5l4.2 4.2L19 7M4 4h16v16H4z" />
}

function CampusWorkflow() {
  const [activeStage, setActiveStage] = useState('brief')
  const activeIndex = STAGES.findIndex((stage) => stage.id === activeStage)
  const activeLabel = STAGES[activeIndex].label

  return (
    <div className="dossier-stage" data-active-stage={activeStage}>
      <div className="dossier-stage-index">
        <div>
          <span className="dossier-stage-kicker">Hành trình bài làm</span>
          <strong>Một quy trình, từng bước rõ ràng</strong>
        </div>
        <span className="dossier-stage-count">{String(activeIndex + 1).padStart(2, '0')} / 05</span>
      </div>

      <ol className="dossier-stage-tabs" aria-label="Các bước trong hành trình bài làm">
        {STAGES.map((stage) => (
          <li key={stage.id}>
            <button
              aria-controls="campus-workflow-stage"
              aria-pressed={activeStage === stage.id}
              className="dossier-stage-tab"
              onClick={() => setActiveStage(stage.id)}
              type="button"
            >
              <span className="dossier-stage-tab-number">{stage.number}</span>
              <strong>{stage.label}</strong>
            </button>
          </li>
        ))}
      </ol>

      <div className="dossier-paper-stack" id="campus-workflow-stage">
        <div className="dossier-paper-shadow dossier-paper-shadow--mint" aria-hidden="true" />
        <div className="dossier-paper-shadow dossier-paper-shadow--yellow" aria-hidden="true" />
        <span className="dossier-spark dossier-spark--one" aria-hidden="true">✦</span>
        <span className="dossier-spark dossier-spark--two" aria-hidden="true">✦</span>

        {STAGES.map((stage) => (
          <article
            aria-hidden={activeStage !== stage.id}
            className={`dossier-sheet dossier-sheet--${stage.id}`}
            key={stage.id}
          >
            <div className="dossier-sheet-tab">{stage.number}</div>
            <div className="dossier-sheet-head">
              <span className="dossier-subject-chip">BÀI GHI</span>
              <span>EDUCRAFT · CAMPUS</span>
            </div>
            <div className="dossier-sheet-body">
              <div className="dossier-stage-symbol" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <StageSymbol stage={stage.id} />
                </svg>
              </div>
              <span className="dossier-sheet-index">{stage.eyebrow}</span>
              <h2>{stage.title}</h2>
              <p>{stage.description}</p>
              <div className="dossier-sheet-summary">
                <span>{stage.note}</span>
                <strong>{stage.status}</strong>
              </div>
            </div>
            <div className="dossier-sheet-foot">
              <span>Hồ sơ học tập</span>
              <span>{stage.number} / 05</span>
            </div>
          </article>
        ))}
      </div>

      <p className="dossier-stage-status" role="status">
        Đang xem <strong>{activeLabel}</strong>
        <span aria-hidden="true">↗</span>
      </p>
    </div>
  )
}

function LandingShowcase({ loginButtonRef, onOpenLogin }) {
  return (
    <section aria-label="Giới thiệu EduCraft" className="living-dossier">
      <div className="living-dossier-highlighter" aria-hidden="true" />
      <header className="living-dossier-header">
        <div className="living-dossier-brand">
          <span aria-hidden="true" className="living-dossier-brand-mark">E</span>
          <div>
            <strong>EduCraft</strong>
            <span className="living-dossier-brand-note">Playful Learning Workspace</span>
          </div>
        </div>
        <button className="living-dossier-header-login" onClick={onOpenLogin} ref={loginButtonRef} type="button">
          Đăng nhập <span aria-hidden="true">→</span>
        </button>
      </header>

      <div className="living-dossier-main">
        <div className="living-dossier-statement">
          <div className="living-dossier-statement-inner">
            <p className="living-dossier-eyebrow">
              <span aria-hidden="true">✦</span>
              Không gian học tập EduCraft
            </p>
            <h1 aria-label="Học tốt hơn. Phản hồi rõ hơn. Mỗi bài làm đều có hành trình.">
              <span>Học tốt hơn.</span>
              <span>Phản hồi <em>rõ hơn.</em></span>
              <span>Mỗi bài làm đều có hành trình.</span>
            </h1>
            <p className="living-dossier-lead">
              Từ lúc giáo viên giao bài đến khi học sinh nhận phản hồi, EduCraft kết nối từng bước
              trong một không gian học tập rõ ràng và gần gũi.
            </p>
            <div className="living-dossier-actions">
              <button className="living-dossier-primary" onClick={onOpenLogin} type="button">
                <span>Vào EduCraft</span>
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
              <span className="living-dossier-action-note">Dành cho Quản trị viên, Giáo viên và Học sinh</span>
            </div>
            <ul className="living-dossier-subjects" aria-label="Các hoạt động học tập trong EduCraft">
              <li><span aria-hidden="true">V</span>Bài ghi</li>
              <li><span aria-hidden="true">A</span>Phân tích hỗ trợ</li>
              <li><span aria-hidden="true">✓</span>Phản hồi giáo viên</li>
            </ul>
          </div>
        </div>

        <CampusWorkflow />
      </div>

      <div className="living-dossier-footer" aria-label="Ba vai trò của EduCraft">
        <span className="living-dossier-footer-intro">Một campus · Ba vai trò</span>
        <div><span>01</span><strong>Quản trị</strong><small>Vận hành lớp học</small></div>
        <div><span>02</span><strong>Giáo viên</strong><small>Giao bài &amp; chốt kết quả</small></div>
        <div><span>03</span><strong>Học sinh</strong><small>Nộp bài &amp; nhận phản hồi</small></div>
      </div>
    </section>
  )
}

export default memo(LandingShowcase)
