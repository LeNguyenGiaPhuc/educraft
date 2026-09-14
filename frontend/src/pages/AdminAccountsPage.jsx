import { useEffect, useState } from 'react'

import { ApiError } from '../services/apiClient.js'
import { adminAccountService } from '../services/adminAccountService.js'
import { authService, ROLES, roleLabels } from '../services/authService.js'
import { filterAdminAccounts, getAccountClassLabel, normalizeAdminAccount } from '../data/adminAccountView.js'

function normalizeClass(item) {
  return {
    ...item,
    id: item.id,
    code: item.code ?? item.id,
  }
}

function AccountForm({ initialForm, onCancel, onSaved }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setSubmitting(true)

    const payload = {
      username: form.username?.trim(),
      email: (form.email ?? '').trim().toLowerCase(),
      full_name: form.name?.trim(),
      role: form.role,
    }

    try {
      const result = initialForm?.id
        ? await adminAccountService.updateAccount(initialForm.id, payload)
        : await adminAccountService.createAccount(payload)

      onSaved(normalizeAccount(result))
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fields ?? {}
        const fieldMap = {}
        for (const [key, message] of Object.entries(fieldErrors)) {
          fieldMap[key] = message
        }
        if (error.message) {
          fieldMap.form = error.message
        }
        setErrors(fieldMap)
        return
      }

      setErrors({ form: error?.message ?? 'Không thể lưu tài khoản này.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-modal-backdrop">
      <div aria-labelledby="account-modal-title" aria-modal="true" className="admin-modal" role="dialog">
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Tài khoản</span>
            <h2 id="account-modal-title">{initialForm?.id ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản'}</h2>
          </div>
          <button aria-label="Đóng cửa sổ" className="icon-button" title="Đóng" type="button" onClick={onCancel}>×</button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field-label">
              <span>Email</span>
              <input value={form.email ?? ''} onChange={(event) => updateField('email', event.target.value)} />
              {errors.email && <small className="field-error">{errors.email}</small>}
            </label>

            <label className="field-label">
              <span>Mật khẩu</span>
              <div className="password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password ?? ''}
                  onChange={(event) => updateField('password', event.target.value)}
                />
                <button
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="password-toggle-button"
                  onClick={() => setShowPassword((value) => !value)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
              {errors.password && <small className="field-error">{errors.password}</small>}
            </label>

            <label className="field-label">
              <span>Họ và tên</span>
              <input value={form.name ?? ''} onChange={(event) => updateField('name', event.target.value)} />
              {errors.full_name && <small className="field-error">{errors.full_name}</small>}
            </label>

            <label className="field-label">
              <span>Vai trò</span>
              <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
                <option value={ROLES.ADMIN}>{roleLabels[ROLES.ADMIN]}</option>
                <option value={ROLES.TEACHER}>{roleLabels[ROLES.TEACHER]}</option>
                <option value={ROLES.STUDENT}>{roleLabels[ROLES.STUDENT]}</option>
              </select>
            </label>

            <div className="admin-form-help">
              <strong>Phân công lớp</strong>
              <p>Admin phân công giáo viên tại màn hình Quản lý lớp học. Học sinh được thêm bằng danh sách lớp hoặc file Excel.</p>
            </div>
          </div>

          {errors.form && <p className="form-field-error" role="alert">{errors.form}</p>}

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminAccountsPage() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [classId, setClassId] = useState('all')
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [notice, setNotice] = useState('')
  const [accounts, setAccounts] = useState([])
  const [classes, setClasses] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [accountRows, classRows] = await Promise.all([
        adminAccountService.listAccounts(),
        adminAccountService.listClasses(),
      ])

      setAccounts(accountRows.map(normalizeAdminAccount))
      setClasses(classRows.map(normalizeClass))

      try {
        const me = await authService.me()
        setCurrentUser(me)
      } catch {
        setCurrentUser(null)
      }
    } catch (caughtError) {
      const details = caughtError instanceof ApiError ? caughtError.message : String(caughtError?.message ?? 'Không thể tải dữ liệu.')
      setError(details)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredAccounts = filterAdminAccounts(accounts, { query, role, classId })

  function openCreate() {
    setEditingAccount(null)
    setShowAccountForm(true)
  }

  function openEdit(account) {
    setEditingAccount(account)
    setShowAccountForm(true)
  }

  async function handleSaved(user) {
    setShowAccountForm(false)
    setEditingAccount(null)
    setNotice(`Đã lưu tài khoản ${user.username}.`)
    await loadData()
  }

  async function handleToggle(account) {
    if (account.id === currentUser?.id) {
      setNotice('Không thể khóa tài khoản đang đăng nhập.')
      return
    }

    const isPendingOrLocked = String(account.status).toLowerCase() === 'pending' || String(account.status).toLowerCase() === 'locked'
    const nextAction = isPendingOrLocked ? 'kích hoạt' : 'khóa'
    const confirmed = window.confirm(`Bạn có chắc chắn muốn ${nextAction} tài khoản ${account.username} không?`)

    if (!confirmed) {
      return
    }

    try {
      if (isPendingOrLocked) {
        await adminAccountService.unlockAccount(account.id)
      } else {
        await adminAccountService.lockAccount(account.id)
      }
      setNotice(`Tài khoản ${account.username} đã đổi trạng thái.`)
      await loadData()
    } catch (caughtError) {
      setNotice(caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể đổi trạng thái tài khoản này.')
    }
  }

  async function handleDelete(account) {
    if (account.id === currentUser?.id) {
      setNotice('Không thể xóa tài khoản đang đăng nhập.')
      return
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản ${account.username} không?`)) {
      return
    }

    try {
      await adminAccountService.deleteAccount(account.id)
      setNotice(`Đã xóa tài khoản ${account.username}.`)
      await loadData()
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 409) {
        setNotice(caughtError.message)
        return
      }
      setNotice(caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể xóa tài khoản này.')
    }
  }

  if (error) {
    return <section className="admin-empty-panel"><p className="state-kicker">Tài khoản</p><h1>Không thể tải danh sách</h1><p>{error}</p></section>
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="state-kicker">Quản lý hệ thống</p>
          <h1>Quản lý tài khoản</h1>
        </div>
        <button className="button button-primary" type="button" onClick={openCreate}>+ Tạo tài khoản</button>
      </div>

      {notice && <div className="admin notice-bar">{notice}</div>}

      <section className="admin-filter-card">
        <div className="admin-filter-row">
          <label className="search-box">
            <span>Tìm kiếm</span>
            <input value={query} placeholder="Tìm kiếm theo tên tài khoản hoặc họ tên..." onChange={(event) => setQuery(event.target.value)} />
          </label>

          <label className="search-box">
            <span>Vai trò</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="all">Tất cả</option>
              <option value={ROLES.ADMIN}>{roleLabels[ROLES.ADMIN]}</option>
              <option value={ROLES.TEACHER}>{roleLabels[ROLES.TEACHER]}</option>
              <option value={ROLES.STUDENT}>{roleLabels[ROLES.STUDENT]}</option>
            </select>
          </label>

          <label className="search-box">
            <span>Lớp học</span>
            <select value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="all">Tất cả lớp</option>
              {classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.code}</option>)}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <section className="admin-empty-panel"><p className="state-kicker">Tài khoản</p><h1>Đang tải danh sách</h1></section>
      ) : (
        <section className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Tên tài khoản</th>
                <th>Họ và tên</th>
                <th>Vai trò</th>
                <th>Lớp học</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr><td colSpan="6" className="empty-row">Không tìm thấy tài khoản phù hợp.</td></tr>
              ) : filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td><strong>{account.username}</strong></td>
                  <td>{account.name}</td>
                  <td><span className="role-badge">{roleLabels[account.role] ?? account.role}</span></td>
                  <td>{getAccountClassLabel(account)}</td>
                  <td><span className={`status-badge status-${account.status}`}>
                    {account.status === 'pending' ? 'Chờ kích hoạt' : account.status === 'locked' ? 'Khóa' : 'Hoạt động'}
                  </span></td>
                  <td>
                    <div className="admin-table-actions">
                      <button className="button button-outline" type="button" onClick={() => openEdit(account)}>Chỉnh sửa</button>
                      <button className="button button-ghost" type="button" onClick={() => handleToggle(account)}>{account.status === 'locked' || account.status === 'pending' ? 'Kích hoạt' : 'Khóa'}</button>
                      <button className="button button-danger" type="button" onClick={() => handleDelete(account)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showAccountForm && (
        <AccountForm
          initialForm={editingAccount ? { email: editingAccount.email ?? '', username: editingAccount.username, name: editingAccount.name, role: editingAccount.role, id: editingAccount.id } : { email: '', name: '', role: ROLES.ADMIN, id: '' }}
          onCancel={() => setShowAccountForm(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default AdminAccountsPage
