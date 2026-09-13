import { useMemo, useState } from 'react'

import {
  ADMIN_STATE,
  createAdminAccount,
  filterAdminAccounts,
  getAccountClassLabel,
  getAdminWorkspace,
  toggleAdminAccountStatus,
  updateAdminAccount,
} from '../data/mockAdminStore.js'
import { getCurrentUser, ROLES } from '../data/mockAuthStore.js'

function AccountForm({ initialForm, classes, onCancel, onSaved }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  function toggleClass(classId) {
    const selected = new Set(form.classIds ?? [])
    if (selected.has(classId)) {
      selected.delete(classId)
    } else {
      selected.add(classId)
    }

    setForm((current) => ({ ...current, classIds: [...selected] }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const normalized = {
      username: form.username,
      password: form.password,
      name: form.name,
      role: form.role,
      classIds: Array.isArray(form.classIds) ? form.classIds : [],
      email: form.email ?? '',
    }

    const result = initialForm?.id
      ? updateAdminAccount(initialForm.id, { ...normalized, id: initialForm.id })
      : createAdminAccount(normalized)

    if (result.status === 'error') {
      setErrors(result.errors)
      return
    }

    onSaved(result.data)
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div>
            <span className="panel-subtitle">Tài khoản</span>
            <h2>{initialForm?.id ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel}>×</button>
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
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
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
              {errors.password && <small className="field-error">{errors.password}</small>}
            </label>

            <label className="field-label">
              <span>Họ và tên</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              {errors.name && <small className="field-error">{errors.name}</small>}
            </label>

            <label className="field-label">
              <span>Vai trò</span>
              <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
                <option value={ROLES.ADMIN}>Admin</option>
                <option value={ROLES.TEACHER}>Teacher</option>
                <option value={ROLES.STUDENT}>Student</option>
              </select>
            </label>

            <fieldset className="admin-class-picks account-class-checkboxes">
              <legend>Lớp học</legend>
              {classes.length === 0 ? (
                <p>Chưa có lớp nào.</p>
              ) : classes.map((classroom) => (
                <label key={classroom.id}>
                  <input
                    checked={(form.classIds ?? []).includes(classroom.id)}
                    type="checkbox"
                    onChange={() => toggleClass(classroom.id)}
                  />
                  {classroom.id}
                </label>
              ))}
            </fieldset>
          </div>

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminAccountsPage() {
  const snapshot = getAdminWorkspace(ADMIN_STATE.SUCCESS)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [classId, setClassId] = useState('all')
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [notice, setNotice] = useState('')

  const classes = snapshot.status === 'success' ? snapshot.data.classes ?? [] : []
  const accounts = snapshot.status === 'success' ? snapshot.data.users ?? [] : []

  const filteredAccounts = useMemo(() => {
    return filterAdminAccounts(accounts, { query, role, classId })
  }, [accounts, query, role, classId])

  function openCreate() {
    setEditingAccount(null)
    setShowAccountForm(true)
  }

  function openEdit(account) {
    setEditingAccount(account)
    setShowAccountForm(true)
  }

  function handleSaved(user) {
    setShowAccountForm(false)
    setEditingAccount(null)
    setNotice(`Đã lưu tài khoản ${user.username}.`)
  }

  function handleToggle(account) {
    const currentUser = getCurrentUser()

    if (account.id === currentUser?.id) {
      window.alert('Không thể khóa tài khoản đang đăng nhập.')
      return
    }

    const nextAction = account.status === 'locked' ? 'kích hoạt' : 'khóa'
    const confirmed = window.confirm(`Bạn có chắc chắn muốn ${nextAction} tài khoản ${account.username} không?`)

    if (!confirmed) {
      return
    }

    const result = toggleAdminAccountStatus(account.id, currentUser?.id)
    if (result.status === 'success') {
      setNotice(`Tài khoản ${account.username} đã đổi trạng thái.`)
      window.location.reload()
      return
    }

    setNotice(result.errors?.form ?? 'Không thể đổi trạng thái tài khoản này.')
  }

  if (snapshot.status === 'error') {
    return <section className="admin-empty-panel"><p className="state-kicker">Tài khoản</p><h1>Không thể tải danh sách</h1><p>{snapshot.message}</p></section>
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
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.TEACHER}>Teacher</option>
              <option value={ROLES.STUDENT}>Student</option>
            </select>
          </label>

          <label className="search-box">
            <span>Lớp học</span>
            <select value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="all">Tất cả lớp</option>
              {classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.id}</option>)}
            </select>
          </label>
        </div>
      </section>

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
                <td><span className="role-badge">{account.role}</span></td>
                <td>{getAccountClassLabel(account, classes)}</td>
                <td><span className={`status-badge status-${account.status}`}>{account.status === 'locked' ? 'Khóa' : 'Hoạt động'}</span></td>
                <td>
                  <div className="admin-table-actions">
                    <button className="button button-outline" type="button" onClick={() => openEdit(account)}>Chỉnh sửa</button>
                    <button className="button button-ghost" type="button" onClick={() => handleToggle(account)}>{account.status === 'locked' ? 'Kích hoạt' : 'Khóa'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showAccountForm && (
        <AccountForm
          initialForm={editingAccount ? { email: editingAccount.email ?? '', username: editingAccount.username, password: '', name: editingAccount.name, role: editingAccount.role, classIds: editingAccount.classIds ?? [], id: editingAccount.id } : { email: '', password: '', name: '', role: ROLES.ADMIN, classIds: [], id: '' }}
          classes={classes}
          onCancel={() => setShowAccountForm(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default AdminAccountsPage
