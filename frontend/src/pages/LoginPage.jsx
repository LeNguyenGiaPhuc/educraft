import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import LandingShowcase from '../components/landing/LandingShowcase.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { authService, getRoleHome, ROLES } from '../services/authService.js'

const demoAccounts = import.meta.env?.DEV
  ? [
      {
        role: ROLES.ADMIN,
        title: 'Quản trị',
        email: import.meta.env.VITE_DEMO_ADMIN_EMAIL,
        password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD,
      },
      {
        role: ROLES.TEACHER,
        title: 'Giáo viên',
        email: import.meta.env.VITE_DEMO_TEACHER_EMAIL,
        password: import.meta.env.VITE_DEMO_TEACHER_PASSWORD,
      },
      {
        role: ROLES.STUDENT,
        title: 'Học sinh',
        email: import.meta.env.VITE_DEMO_STUDENT_EMAIL,
        password: import.meta.env.VITE_DEMO_STUDENT_PASSWORD,
      },
    ].filter((account) => account.email && account.password)
  : []

function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const oauthFailed = new URLSearchParams(location.search).get('oauth') === 'failed'
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [status, setStatus] = useState(() => oauthFailed
    ? {
        tone: 'error',
        message: 'Đăng nhập Google không thành công hoặc tài khoản chưa được kích hoạt.',
      }
    : { tone: 'idle', message: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(oauthFailed)
  const dialogRef = useRef(null)
  const loginOpenButtonRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return undefined
    }

    if (isLoginOpen) {
      document.body.classList.add('login-dialog-open')

      if (!dialog.open) {
        dialog.showModal()
      }

      closeButtonRef.current?.focus()
    } else {
      document.body.classList.remove('login-dialog-open')

      if (dialog.open) {
        dialog.close()
      }
    }

    return () => {
      document.body.classList.remove('login-dialog-open')
    }
  }, [isLoginOpen])

  const openLoginPanel = useCallback(() => {
    setStatus({ tone: 'idle', message: '' })
    setIsLoginOpen(true)
  }, [])

  if (user) {
    return <Navigate replace to={getRoleHome(user.role)} />
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus({ tone: 'idle', message: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ tone: 'loading', message: 'Đang đăng nhập...' })

    const result = await login(form.email, form.password)

    if (result.status === 'error') {
      setStatus({ tone: 'error', message: result.message })
      return
    }

    setStatus({ tone: 'success', message: 'Đăng nhập thành công.' })
    const from = location.state?.from
    const destination = from && from !== '/login' ? from : getRoleHome(result.data.role)
    navigate(destination, { replace: true })
  }

  function applyDemoAccount(account) {
    setForm({ email: account.email, password: account.password })
    setShowPassword(false)
    setStatus({ tone: 'idle', message: '' })
  }

  function closeLoginPanel() {
    if (status.tone !== 'loading') {
      setIsLoginOpen(false)
    }
  }

  function handleDialogCancel(event) {
    if (status.tone === 'loading') {
      event.preventDefault()
    }
  }

  function handleDialogClose() {
    setIsLoginOpen(false)
    window.requestAnimationFrame(() => loginOpenButtonRef.current?.focus())
  }

  return (
    <main className="login-page">
      <LandingShowcase loginButtonRef={loginOpenButtonRef} onOpenLogin={openLoginPanel} />

      <dialog
        aria-describedby="login-description"
        aria-labelledby="login-title"
        className="login-panel kf-login"
        onCancel={handleDialogCancel}
        onClose={handleDialogClose}
        ref={dialogRef}
      >
        <div className="login-dialog-header">
          <div className="login-brand">
            <span className="brand-mark" aria-hidden="true">E</span>
            <strong>EduCraft</strong>
          </div>
          <button
            aria-label="Đóng đăng nhập"
            className="login-close-button"
            disabled={status.tone === 'loading'}
            onClick={closeLoginPanel}
            ref={closeButtonRef}
            title="Đóng"
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="login-dialog-body">
          <aside className="login-campus-card" aria-label="Không gian học tập EduCraft">
            <span className="login-campus-eyebrow">EDUCRAFT CAMPUS</span>
            <h2>Mỗi vai trò, một không gian học tập phù hợp.</h2>
            <p>
              Quản trị viên vận hành lớp học, giáo viên theo dõi bài làm và học sinh nhận phản hồi
              trong cùng một hành trình.
            </p>
            <div className="login-campus-path" aria-hidden="true">
              <span>Giao bài</span>
              <i>→</i>
              <span>Nộp bài</span>
              <i>→</i>
              <span>Phản hồi</span>
            </div>
            <div className="login-campus-paper" aria-hidden="true">
              <span>VĂN · TOÁN · KHOA HỌC</span>
              <strong>Học tập rõ ràng,<br />từng bước một.</strong>
              <i>✦</i>
            </div>
          </aside>

          <div className="login-auth-card">
            <div className="login-panel-heading">
              <span className="login-panel-eyebrow">ĐĂNG NHẬP</span>
              <div>
                <h1 id="login-title">Chào mừng trở lại.</h1>
                <p id="login-description">Tiếp tục công việc của bạn trong EduCraft.</p>
              </div>
            </div>

            {demoAccounts.length > 0 && (
              <div className="demo-login-section">
                <span className="demo-login-label">Truy cập nhanh · Môi trường phát triển</span>
                <div className="demo-login-grid" aria-label="Tài khoản mẫu">
                  {demoAccounts.map((account) => (
                    <button
                      aria-pressed={form.email === account.email}
                      className={`demo-login-button${form.email === account.email ? ' demo-login-button-active' : ''}`}
                      key={account.role}
                      disabled={status.tone === 'loading'}
                      onClick={() => applyDemoAccount(account)}
                      type="button"
                    >
                      <strong>{account.title}</strong>
                      <span>{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form className="login-form" aria-busy={status.tone === 'loading'} noValidate onSubmit={handleSubmit}>
              <a className="button button-outline google-login-button" href={authService.getGoogleLoginUrl()}>
                <span className="google-login-mark" aria-hidden="true">G</span>
                <span>Đăng nhập với Google</span>
                <span className="google-login-arrow" aria-hidden="true">↗</span>
              </a>
              <div className="login-method-divider" aria-hidden="true"><span>hoặc dùng email</span></div>
              <div className="form-field">
                <label htmlFor="login-email">Email</label>
                <input
                  autoComplete="username"
                  aria-describedby={status.tone === 'error' ? 'login-result' : undefined}
                  id="login-email"
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="ban@truong.edu.vn"
                  type="email"
                  value={form.email}
                />
              </div>
              <div className="form-field">
                <label htmlFor="login-password">Mật khẩu</label>
                <div className="password-row">
                  <input
                    autoComplete="current-password"
                    aria-describedby={status.tone === 'error' ? 'login-result' : undefined}
                    id="login-password"
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="Nhập mật khẩu"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                  />
                  <button
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                    className="password-toggle-button"
                    onClick={() => setShowPassword((value) => !value)}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    type="button"
                  >
                    <svg aria-hidden="true" className="password-toggle-icon" viewBox="0 0 24 24">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" strokeWidth="2" />
                      {showPassword && <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />}
                    </svg>
                  </button>
                </div>
              </div>

              {status.message && (
                <div
                  id="login-result"
                  className={`form-submit-message ${status.tone === 'error' ? 'form-submit-error' : status.tone === 'success' ? 'form-submit-success' : 'login-submit-pending'}`}
                  role={status.tone === 'error' ? 'alert' : 'status'}
                >
                  {status.message}
                </div>
              )}

              <button
                aria-busy={status.tone === 'loading'}
                className="button button-primary"
                disabled={status.tone === 'loading'}
                type="submit"
              >
                <span>{status.tone === 'loading' ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
                {status.tone !== 'loading' && <span aria-hidden="true">→</span>}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </main>
  )
}

export default LoginPage
