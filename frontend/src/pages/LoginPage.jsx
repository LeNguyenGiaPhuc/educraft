import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import LandingShowcase from '../components/landing/LandingShowcase.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { getRoleHome, ROLES } from '../services/authService.js'

const demoAccounts = [
  { role: ROLES.ADMIN, title: 'Quản trị', email: 'admin@educraft.test', password: 'admin123' },
  { role: ROLES.TEACHER, title: 'Giáo viên', email: 'teacher@educraft.test', password: 'teacher123' },
  { role: ROLES.STUDENT, title: 'Học sinh', email: 'student@educraft.test', password: 'student123' },
]

function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: demoAccounts[0].email,
    password: demoAccounts[0].password,
  })
  const [status, setStatus] = useState({ tone: 'idle', message: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
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
        aria-labelledby="login-title"
        className="login-panel"
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
            onClick={closeLoginPanel}
            ref={closeButtonRef}
            title="Đóng"
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="login-panel-heading">
          <span className="login-panel-index" aria-hidden="true">01</span>
          <div>
            <h1 id="login-title">Chào mừng trở lại.</h1>
            <p>Đăng nhập để tiếp tục công việc trong EduCraft.</p>
          </div>
        </div>

        <div className="demo-login-grid" aria-label="Tài khoản mẫu">
          {demoAccounts.map((account) => (
            <button
              aria-pressed={form.email === account.email}
              className={`demo-login-button${form.email === account.email ? ' demo-login-button-active' : ''}`}
              key={account.role}
              onClick={() => applyDemoAccount(account)}
              type="button"
            >
              <strong>{account.title}</strong>
              <span>{account.email}</span>
            </button>
          ))}
        </div>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="login-email">Email</label>
            <input
              autoComplete="username"
              id="login-email"
              onChange={(event) => updateField('email', event.target.value)}
              type="email"
              value={form.email}
            />
          </div>
          <div className="form-field">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="password-row">
              <input
                autoComplete="current-password"
                id="login-password"
                onChange={(event) => updateField('password', event.target.value)}
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

        <p className="login-panel-note">Ba vai trò. Một luồng học tập liền mạch.</p>
      </dialog>
    </main>
  )
}

export default LoginPage
