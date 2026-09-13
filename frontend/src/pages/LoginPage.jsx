import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { getRoleHome, ROLES } from '../data/mockAuthStore.js'

const demoAccounts = [
  {
    role: ROLES.ADMIN,
    title: 'Admin',
    email: 'admin@educraft.test',
    password: 'admin123',
  },
  {
    role: ROLES.TEACHER,
    title: 'Teacher',
    email: 'teacher@educraft.test',
    password: 'teacher123',
  },
  {
    role: ROLES.STUDENT,
    title: 'Student',
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
    setStatus({ tone: 'loading', message: 'Dang dang nhap...' })

    await new Promise((resolve) => {
      window.setTimeout(resolve, 350)
    })

    const result = login(form.email, form.password)

    if (result.status === 'error') {
      setStatus({ tone: 'error', message: result.message })
      return
    }

    setStatus({ tone: 'success', message: 'Dang nhap thanh cong.' })
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
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>EduCraft</span>
        </div>
        <p className="state-kicker">Mock auth</p>
        <h1 id="login-title">Dang nhap he thong</h1>
        <p>Chon nhanh mot tai khoan mau hoac nhap dung email va mat khau ben duoi.</p>

        <div className="demo-login-grid" aria-label="Tai khoan mau">
          {demoAccounts.map((account) => (
            <button
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
            <label htmlFor="login-password">Mat khau</label>
            <div className="password-row">
              <input
                autoComplete="current-password"
                id="login-password"
                onChange={(event) => updateField('password', event.target.value)}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
              />
              <button
                aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                className="password-toggle-button"
                onClick={() => setShowPassword((value) => !value)}
                title={showPassword ? 'An mat khau' : 'Hien mat khau'}
                type="button"
              >
                <svg aria-hidden="true" className="password-toggle-icon" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  ) : (
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  )}
                  <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  {showPassword ? (
                    <circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" strokeWidth="2" />
                  ) : null}
                </svg>
              </button>
            </div>
          </div>

          {status.message && (
            <div
              className={`form-submit-message ${status.tone === 'success' ? 'form-submit-success' : 'form-submit-error'}`}
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
            {status.tone === 'loading' ? 'Dang dang nhap...' : 'Dang nhap'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
