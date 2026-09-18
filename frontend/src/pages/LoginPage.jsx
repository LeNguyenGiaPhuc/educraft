import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { getRoleHome, ROLES } from '../services/authService.js'

const demoAccounts = [
  {
    role: ROLES.ADMIN,
    title: 'Quản trị',
    email: 'admin@educraft.test',
    password: 'admin123',
  },
  {
    role: ROLES.TEACHER,
    title: 'Giáo viên',
    email: 'teacher@educraft.test',
    password: 'teacher123',
  },
  {
    role: ROLES.STUDENT,
    title: 'Học sinh',
    email: 'student@educraft.test',
    password: 'student123',
  },
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
    setForm({
      email: account.email,
      password: account.password,
    })
    setShowPassword(false)
    setStatus({ tone: 'idle', message: '' })
  }

  return (
    <main className="login-page">
      <aside className="login-introduction" aria-label="Về EduCraft">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>EduCraft</span>
        </div>
        <div className="login-introduction-copy">
          <p className="state-kicker">Không gian học tập</p>
          <h2>Mỗi bài ghi.<br />Một bước tiến.</h2>
          <p>Kết nối lớp học, bài ghi và phản hồi của giáo viên trong một không gian.</p>
          <ul className="login-workflows">
            <li><strong>Quản trị</strong><span>Quản lý tài khoản và lớp học</span></li>
            <li><strong>Giáo viên</strong><span>Giao bài, xem bài nộp và chốt kết quả</span></li>
            <li><strong>Học sinh</strong><span>Nộp bài ghi và theo dõi nhận xét</span></li>
          </ul>
        </div>
        <p className="login-introduction-footer">Cùng học. Cùng tiến bộ.</p>
      </aside>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand login-mobile-brand">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>EduCraft</span>
        </div>
        <p className="state-kicker">Đăng nhập thử nghiệm</p>
        <h1 id="login-title">Đăng nhập hệ thống</h1>
        <p>Chọn nhanh một tài khoản mẫu hoặc nhập đúng email và mật khẩu bên dưới.</p>

        <div className="demo-login-grid" aria-label="Tài khoản mẫu">
          {demoAccounts.map((account) => (
            <button
              className={`demo-login-button${form.email === account.email ? ' demo-login-button-active' : ''}`}
              aria-pressed={form.email === account.email}
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
            {status.tone === 'loading' ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
