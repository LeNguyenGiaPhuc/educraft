import { useCallback, useEffect, useRef, useState } from 'react'

import { useAdminScope, useRegistryPage } from '../components/admin/registryHooks.js'
import RegistryPagination from '../components/admin/RegistryPagination.jsx'
import { registryFieldErrors } from '../data/adminRegistry.js'
import AdminModal from '../components/AdminModal.jsx'
import FormField from '../components/kinetic/FormField.jsx'
import { ApiError } from '../services/apiClient.js'
import { adminAccountService } from '../services/adminAccountService.js'
import { authService, ROLES, roleLabels } from '../services/authService.js'
import { validateAccountPassword } from '../data/accountPassword.js'
import { filterAdminAccounts, getAccountClassLabel, normalizeAdminAccount } from '../data/adminAccountView.js'

function normalizeClass(item) {
  return {
    ...item,
    id: item.id,
    code: item.code ?? item.id,
  }
}

async function fetchAccountPageData() {
  const [accountRows, classRows, me] = await Promise.all([
    adminAccountService.listAccounts(),
    adminAccountService.listClasses(),
    authService.me().catch(() => null),
  ])

  return { accountRows, classRows, me }
}

export function AccountForm({ initialForm, onCancel, onSaved }) {
  const scope = useAdminScope()
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

    const passwordError = validateAccountPassword(form.password, { required: !initialForm?.id })
    if (passwordError) {
      setErrors({ password: passwordError })
      setSubmitting(false)
      return
    }

    const payload = {
      username: form.username?.trim(),
      email: (form.email ?? '').trim().toLowerCase(),
      full_name: form.name?.trim(),
      role: form.role,
    }

    if (form.password?.trim()) {
      payload.password = form.password.trim()
    }

    return scope.mutate('save', async () => {
      setSubmitting(true)
      return initialForm?.id
        ? await adminAccountService.updateAccount(initialForm.id, payload)
        : await adminAccountService.createAccount(payload)

    }, { success: result => onSaved(normalizeAdminAccount(result)), error: error => {
      if (error instanceof ApiError) {
        const fieldMap = registryFieldErrors(error.fields)
        if (error.message) {
          fieldMap.form = error.message
        }
        setErrors(fieldMap)
        return
      }

      setErrors({ form: error?.message ?? 'Không thể lưu tài khoản này.' })
    }, settled: () => setSubmitting(false) })
  }

  return (
    <AdminModal labelledBy="account-modal-title" onClose={onCancel}>
        <div className="admin-modal-header">
          <div>
            <h2 id="account-modal-title">{initialForm?.id ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản'}</h2>
          </div>
          <button aria-label="Đóng cửa sổ" className="icon-button" data-modal-initial-focus title="Đóng" type="button" onClick={onCancel}>×</button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="form-grid" disabled={submitting}>
            <FormField label="Email" error={errors.email}>
              <input value={form.email ?? ''} onChange={(event) => updateField('email', event.target.value)} />
            </FormField>

            <FormField label="Tên tài khoản" error={errors.username}>
              <input value={form.username ?? ''} onChange={(event) => updateField('username', event.target.value)} />
            </FormField>

            <div className="field-label">
              <label htmlFor="account-password">{initialForm?.id ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'}</label>
              <div className="password-row">
                <input
                  aria-describedby={errors.password ? 'account-password-error' : undefined}
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="new-password"
                  id="account-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password ?? ''}
                  onChange={(event) => updateField('password', event.target.value)}
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
              {errors.password && <small className="field-error" id="account-password-error">{errors.password}</small>}
            </div>

            <FormField label="Họ và tên" error={errors.name}>
              <input value={form.name ?? ''} onChange={(event) => updateField('name', event.target.value)} />
            </FormField>

            <FormField label="Vai trò" error={errors.role}>
              <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
                <option value={ROLES.ADMIN}>{roleLabels[ROLES.ADMIN]}</option>
                <option value={ROLES.TEACHER}>{roleLabels[ROLES.TEACHER]}</option>
                <option value={ROLES.STUDENT}>{roleLabels[ROLES.STUDENT]}</option>
              </select>
            </FormField>

            <div className="admin-form-help">
              <strong>Phân công lớp</strong>
              <p>Admin phân công giáo viên tại màn hình Quản lý lớp học. Học sinh được thêm bằng danh sách lớp hoặc file Excel.</p>
              <p>Tài khoản mới sẽ ở trạng thái chờ kích hoạt. Admin có thể đặt mật khẩu tại đây; mật khẩu không được lưu trong danh sách hoặc file Excel.</p>
            </div>
          </fieldset>

          {errors.form && <p className="form-field-error" role="alert">{errors.form}</p>}

          <div className="admin-form-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Hủy</button>
            <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
    </AdminModal>
  )
}

function AdminAccountsPage() {
  const scope = useAdminScope()
  const [busyId, setBusyId] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [classId, setClassId] = useState('all')
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [notice, setNotice] = useState('')
  const [accounts, setAccounts] = useState([])
  const [classes, setClasses] = useState([])
  const currentUserRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(() => {
    return scope.read('load', fetchAccountPageData, {
      success: ({accountRows,classRows,me}) => { setError(null); setAccounts(accountRows.map(normalizeAdminAccount)); setClasses(classRows.map(normalizeClass)); currentUserRef.current=me },
      error: error => setError(error.message ?? 'Không thể tải dữ liệu.'),
      settled: () => setLoading(false),
    })
  }, [scope])
  useEffect(() => { void loadData() }, [loadData])

  const filteredAccounts = filterAdminAccounts(accounts, { query, role, classId })

  const page = useRegistryPage(filteredAccounts, 25, JSON.stringify([query,role,classId]))

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
    if (account.id === currentUserRef.current?.id) {
      setNotice('Không thể khóa tài khoản đang đăng nhập.')
      return
    }

    const isPendingOrLocked = String(account.status).toLowerCase() === 'pending' || String(account.status).toLowerCase() === 'locked'
    const nextAction = isPendingOrLocked ? 'kích hoạt' : 'khóa'
    const confirmed = window.confirm(`Bạn có chắc chắn muốn ${nextAction} tài khoản ${account.username} không?`)

    if (!confirmed) {
      return
    }

    return scope.mutate('account:'+account.id, async () => {
      setBusyId(account.id)
      return isPendingOrLocked ? adminAccountService.unlockAccount(account.id) : adminAccountService.lockAccount(account.id)
    }, { success: async () => { setNotice(`Tài khoản ${account.username} đã đổi trạng thái.`); await loadData() },
      error: error => setNotice(error.message ?? 'Không thể đổi trạng thái tài khoản này.'), settled:()=>setBusyId('') })
  }

  async function handleDelete(account) {
    if(account.id===currentUserRef.current?.id) {setNotice('Không thể xóa tài khoản đang đăng nhập.');return}
    if(!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản ${account.username} không?`))return
    return scope.mutate('account:'+account.id, async()=>{setBusyId(account.id);return adminAccountService.deleteAccount(account.id)}, {
      success: async()=>{setNotice(`Đã xóa tài khoản ${account.username}.`);await loadData()},
      error:error=>setNotice(error.message ?? 'Không thể xóa tài khoản này.'), settled:()=>setBusyId('')
    })
  }

  if (error) {
    return <section className="admin-state-panel" role="alert"><h1>Không thể tải danh sách</h1><p>{error}</p></section>
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Quản lý tài khoản</h1>
          <p>Tìm, cập nhật trạng thái và quản lý quyền truy cập của tài khoản.</p>
        </div>
        <button className="button button-primary" type="button" onClick={openCreate}>+ Tạo tài khoản</button>
      </div>

      {notice && <div className="admin notice-bar" role="status">{notice}</div>}
      {busyId && <p role="status">Đang cập nhật tài khoản…</p>}

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
        <section className="admin-state-panel" aria-live="polite"><h2>Đang tải danh sách tài khoản...</h2></section>
      ) : (
        <section className="admin-table-panel" aria-label="Danh sách tài khoản">
          <div className="admin-table-heading">
            <div>
              <h2>Danh sách tài khoản</h2>
              <p>{filteredAccounts.length} tài khoản trong dữ liệu đã tải phù hợp với bộ lọc.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
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
                ) : page.items.map((account) => (
                  <tr key={account.id} data-record-id={account.id}>
                    <td data-label="Tên tài khoản"><strong>{account.username}</strong></td>
                    <td data-label="Họ và tên">{account.name}</td>
                    <td data-label="Vai trò"><span className="role-badge">{roleLabels[account.role] ?? account.role}</span></td>
                    <td data-label="Lớp học">{getAccountClassLabel(account)}</td>
                    <td data-label="Trạng thái"><span className={`status-badge status-${account.status}`}>
                      {account.status === 'pending' ? 'Chờ kích hoạt' : account.status === 'locked' ? 'Khóa' : 'Hoạt động'}
                    </span></td>
                    <td data-label="Thao tác">
                      <div className="admin-table-actions">
                        <button className="button button-outline" type="button" disabled={busyId === account.id} onClick={() => openEdit(account)}>Chỉnh sửa</button>
                        <button className="button button-ghost" type="button" disabled={busyId === account.id} onClick={() => handleToggle(account)}>{account.status === 'locked' || account.status === 'pending' ? 'Kích hoạt' : 'Khóa'}</button>
                        <button className="button button-danger" type="button" disabled={busyId === account.id} onClick={() => handleDelete(account)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <RegistryPagination view={page} label="Phân trang tài khoản" />
        </section>
      )}

      {showAccountForm && (
        <AccountForm
          initialForm={editingAccount ? { email: editingAccount.email ?? '', username: editingAccount.username, password: '', name: editingAccount.name, role: editingAccount.role, id: editingAccount.id } : { email: '', username: '', name: '', password: '', role: ROLES.ADMIN, id: '' }}
          onCancel={() => setShowAccountForm(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default AdminAccountsPage
