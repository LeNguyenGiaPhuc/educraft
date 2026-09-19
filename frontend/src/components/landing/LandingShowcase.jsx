import { memo, useState } from 'react'

const STAGES = [
  {
    id: '01',
    label: 'Giao bài',
    title: 'Bấm để xem bước Giao bài',
    toplineLeft: 'Giáo viên • Môn Toán 12',
    toplineRight: 'Ngưỡng đạt: 80%',
    cardHeading: 'Bài ghi: Khảo sát và vẽ đồ thị hàm số',
    statusDesc: 'Bài mẫu và các ý chính đã sẵn sàng để đối chiếu',
    statusBadge: 'Đang mở nộp',
  },
  {
    id: '02',
    label: 'Nộp bài',
    title: 'Bấm để xem bước Nộp bài',
    toplineLeft: 'Học sinh: Nguyễn Văn An',
    toplineRight: 'Đúng hạn • Lần #01',
    cardHeading: 'Ảnh bài làm học sinh (JPG)',
    statusDesc: 'Ảnh bài ghi được lưu trong vùng lưu trữ riêng tư',
    statusBadge: 'Chờ đánh giá',
  },
  {
    id: '03',
    label: 'Phản hồi',
    title: 'Bấm để xem bước Phản hồi',
    toplineLeft: 'Độ phủ mô phỏng: 82%',
    toplineRight: 'Kết quả: Hoàn thành',
    cardHeading: 'Giáo viên đã xem và chốt kết quả',
    statusDesc: 'Nhận xét: “Trình bày mạch lạc, đủ các ý quan trọng.”',
    statusBadge: 'Đã chốt',
  },
]

function LearningFlow() {
  const [activeStageId, setActiveStageId] = useState('02')
  const activeStage = STAGES.find((stage) => stage.id === activeStageId) ?? STAGES[1]

  return (
    <div className="learning-flow" aria-label="Luồng học tập tương tác của EduCraft">
      <div className="learning-flow-header">
        <strong>Luồng học tập tương tác</strong>
        <span><i aria-hidden="true" /> Đang hoạt động</span>
      </div>

      <ol className="learning-flow-stages">
        {STAGES.map((stage) => (
          <li className={activeStageId === stage.id ? 'learning-flow-stage-active' : ''} key={stage.id}>
            <button
              aria-controls="learning-flow-preview"
              aria-pressed={activeStageId === stage.id}
              onClick={() => setActiveStageId(stage.id)}
              title={stage.title}
              type="button"
            >
              <span>{stage.id}</span>
              <strong>{stage.label}</strong>
            </button>
          </li>
        ))}
      </ol>

      <div className="learning-flow-canvas" id="learning-flow-preview">
        <div className="learning-flow-line" />
        <div className="learning-card" key={activeStage.id}>
          <div className="learning-card-topline">
            <span>{activeStage.toplineLeft}</span>
            <span>{activeStage.toplineRight}</span>
          </div>
          <strong>{activeStage.cardHeading}</strong>
          <div className="learning-card-status">
            <span>{activeStage.statusDesc}</span>
            <b>{activeStage.statusBadge}</b>
          </div>
        </div>
      </div>

      <div className="learning-flow-footer">
        <span>Rõ việc</span>
        <span>Đúng lớp</span>
        <span>Thấy tiến bộ</span>
      </div>
    </div>
  )
}

function RoleSection() {
  return (
    <section className="blueprint-section" id="blueprint-roles">
      <div className="blueprint-section-header">
        <h3>Ba không gian làm việc, một luồng dữ liệu</h3>
        <p>Mỗi vai trò chỉ thấy đúng công việc của mình; quyền truy cập được kiểm soát ở giao diện, API và cơ sở dữ liệu.</p>
      </div>
      <div className="blueprint-cards-grid">
        <article className="blueprint-role-card">
          <div className="role-card-header">
            <span className="role-code">SYS-ADMIN</span>
            <span className="role-status-badge">Vận hành</span>
          </div>
          <h4>Quản trị viên</h4>
          <p>Quản lý tài khoản, lớp học và quyền truy cập toàn trường trong một khu vực thống nhất.</p>
          <ul className="blueprint-feature-list">
            <li>Tạo tài khoản, đặt mật khẩu, kích hoạt hoặc khóa khi cần.</li>
            <li>Khởi tạo lớp và phân công giáo viên đang hoạt động.</li>
            <li>Nhập danh sách học sinh từ Excel sau bước kiểm tra dữ liệu.</li>
          </ul>
        </article>
        <article className="blueprint-role-card blueprint-role-card-highlight">
          <div className="role-card-header">
            <span className="role-code">SYS-TEACHER</span>
            <span className="role-status-badge">Chuyên môn</span>
          </div>
          <h4>Giáo viên</h4>
          <p>Giao bài, theo dõi bài nộp, tham khảo kết quả đối chiếu và chốt phản hồi cuối cùng.</p>
          <ul className="blueprint-feature-list">
            <li>Chỉ truy cập các lớp được quản trị viên phân công.</li>
            <li>Tạo bài kiểm tra và quản lý nhiều ảnh bài mẫu.</li>
            <li>Xem từng lượt nộp, chỉnh nhận xét và chốt trạng thái.</li>
          </ul>
        </article>
        <article className="blueprint-role-card">
          <div className="role-card-header">
            <span className="role-code">SYS-STUDENT</span>
            <span className="role-status-badge">Học tập</span>
          </div>
          <h4>Học sinh</h4>
          <p>Xem đúng bài kiểm tra của lớp, gửi ảnh bài ghi và theo dõi phản hồi theo từng lần nộp.</p>
          <ul className="blueprint-feature-list">
            <li>Truy cập các lớp và bài kiểm tra mình được ghi danh.</li>
            <li>Gửi một ảnh JPG hoặc PNG cho mỗi lượt nộp.</li>
            <li>Xem lịch sử nộp và nhận xét sau khi giáo viên chốt.</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function EvaluationSection() {
  return (
    <section className="blueprint-section" id="blueprint-ai">
      <div className="blueprint-section-header">
        <h3>Bộ đánh giá gợi ý, giáo viên quyết định</h3>
        <p>Trong prototype, evaluator mô phỏng deterministic đối chiếu các ý chính và tạo bản nháp để giáo viên tham khảo.</p>
      </div>
      <div className="blueprint-pipeline-grid">
        <article className="pipeline-step">
          <div className="step-num">01</div>
          <h5>Tiếp nhận bài làm</h5>
          <p>Ảnh bài ghi được lưu trong Supabase Private Storage và chỉ truy cập qua luồng được xác thực.</p>
        </article>
        <article className="pipeline-step">
          <div className="step-num">02</div>
          <h5>Đối chiếu ý chính</h5>
          <p>Evaluator mô phỏng so sánh bài nộp với các đơn vị kiến thức mà giáo viên đã chuẩn bị.</p>
        </article>
        <article className="pipeline-step">
          <div className="step-num">03</div>
          <h5>Tạo bản nháp</h5>
          <p>Hệ thống gợi ý nội dung còn thiếu và một bản nhận xét để giáo viên xem lại.</p>
        </article>
        <article className="pipeline-step pipeline-step-final">
          <div className="step-num">04</div>
          <h5>Chốt kết quả</h5>
          <p>Giáo viên chỉnh nhận xét, chọn trạng thái cuối cùng và xác nhận kết quả chính thức.</p>
        </article>
      </div>
    </section>
  )
}

function TechnologySection() {
  return (
    <section className="blueprint-section blueprint-section-tech" id="blueprint-tech">
      <div className="blueprint-section-header">
        <h3>Nền tảng kỹ thuật phục vụ đúng luồng học tập</h3>
        <p>Mỗi lớp bảo vệ bổ sung một ranh giới rõ ràng cho dữ liệu, phiên đăng nhập và thao tác theo vai trò.</p>
      </div>
      <div className="blueprint-tech-grid">
        <article className="tech-spec-item">
          <span className="tech-spec-label">CƠ SỞ DỮ LIỆU</span>
          <strong>PostgreSQL và Supabase RLS</strong>
          <p>Mười bảng dữ liệu có chính sách Row Level Security và Storage Policy giới hạn truy cập theo quyền.</p>
        </article>
        <article className="tech-spec-item">
          <span className="tech-spec-label">BACKEND API</span>
          <strong>Express 5, Zod và Cookies</strong>
          <p>Phiên dùng HttpOnly Cookie; Origin Guard và validation giúp thu hẹp bề mặt thao tác không hợp lệ.</p>
        </article>
        <article className="tech-spec-item">
          <span className="tech-spec-label">GIAO DIỆN CLIENT</span>
          <strong>React 19 và React Router 7</strong>
          <p>SPA phân quyền theo route, tách màn hình theo vai trò và dùng hệ giao diện Academic Blueprint.</p>
        </article>
        <article className="tech-spec-item">
          <span className="tech-spec-label">CHẤT LƯỢNG MÃ NGUỒN</span>
          <strong>Kiểm thử tự động</strong>
          <p>Các luồng frontend, backend và cơ sở dữ liệu được kiểm tra trước khi tích hợp.</p>
        </article>
      </div>
    </section>
  )
}

function LandingShowcase({ loginButtonRef, onOpenLogin }) {
  return (
    <section className="login-introduction" aria-label="Giới thiệu EduCraft">
      <header className="login-introduction-header">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">E</span>
          <strong>EduCraft</strong>
          <span className="blueprint-version-badge">Prototype</span>
        </div>

        <nav className="login-nav-links" aria-label="Điều hướng trang chủ">
          <a href="#learning-flow-anchor" className="login-nav-link">Quy trình</a>
          <a href="#blueprint-roles" className="login-nav-link">Vai trò</a>
          <a href="#blueprint-ai" className="login-nav-link">Đánh giá</a>
          <a href="#blueprint-tech" className="login-nav-link">Kỹ thuật</a>
        </nav>

        <button className="login-open-button" onClick={onOpenLogin} ref={loginButtonRef} type="button">
          <span>Đăng nhập</span>
          <span aria-hidden="true">→</span>
        </button>
      </header>

      <div className="login-introduction-copy" id="learning-flow-anchor">
        <div className="login-hero-text">
          <h2>
            <span>Mỗi bài ghi,</span>
            <span className="login-headline-outline">một bước tiến.</span>
          </h2>

          <p className="login-hero-description">
            EduCraft kết nối giao bài, ảnh bài ghi và phản hồi trong một quy trình rõ ràng.
            Bộ đánh giá mô phỏng hỗ trợ đối chiếu ý chính, còn quyết định chuyên môn luôn thuộc về giáo viên.
          </p>

          <div className="login-hero-actions">
            <button className="login-open-button" onClick={onOpenLogin} type="button">
              <span>Trải nghiệm ngay</span>
              <span aria-hidden="true">→</span>
            </button>
            <a className="button button-outline login-hero-secondary" href="#blueprint-roles">
              <span>Khám phá vai trò</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="blueprint-metrics-strip" aria-label="Khả năng chính">
            <div className="metric-cell"><strong>03</strong><span>Vai trò chuyên biệt</span></div>
            <div className="metric-cell"><strong>Teacher</strong><span>Chốt kết quả cuối</span></div>
            <div className="metric-cell"><strong>JPG • PNG</strong><span>Ảnh bài ghi</span></div>
            <div className="metric-cell"><strong>RLS</strong><span>Giới hạn truy cập dữ liệu</span></div>
          </div>
        </div>

        <LearningFlow />
      </div>

      <RoleSection />
      <EvaluationSection />
      <TechnologySection />

      <div className="blueprint-cta-banner">
        <div className="cta-banner-content">
          <h3>Sẵn sàng trải nghiệm EduCraft?</h3>
          <p>Dùng tài khoản mẫu của quản trị viên, giáo viên hoặc học sinh để đi qua toàn bộ quy trình.</p>
        </div>
        <button className="login-open-button" onClick={onOpenLogin} type="button">
          <span>Đăng nhập trải nghiệm</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <footer className="login-introduction-footer">
        <span>EduCraft Prototype • HCMUTE New Tech Project • 2026</span>
        <span aria-hidden="true">LỚP → BÀI GHI → PHẢN HỒI</span>
      </footer>
    </section>
  )
}

export default memo(LandingShowcase)

