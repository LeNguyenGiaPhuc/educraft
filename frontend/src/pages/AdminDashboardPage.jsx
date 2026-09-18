import { Link } from 'react-router-dom'

import { useEffect, useState } from 'react'

import { adminAccountService } from '../services/adminAccountService.js'
import { adminClassService } from '../services/adminClassService.js'
import { ApiError } from '../services/apiClient.js'
import { ROLES } from '../services/authService.js'

async function fetchDashboardStats() {
  const [accounts, classes] = await Promise.all([
    adminAccountService.listAccounts(),
    adminClassService.listClasses(),
  ])

  const users = Array.isArray(accounts) ? accounts : []
  const classRows = Array.isArray(classes) ? classes : []

  return {
    users: users.length,
    teachers: users.filter((user) => user.role === ROLES.TEACHER).length,
    students: users.filter((user) => user.role === ROLES.STUDENT).length,
    classes: classRows.length,
  }
}

function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, classes: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    fetchDashboardStats()
      .then((nextStats) => {
        if (active) setStats(nextStats)
      })
      .catch((caughtError) => {
        if (!active) return
        const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể tải tổng quan quản trị.'
        setError(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <section className="admin-state-panel" role="alert">
        <h1>Bảng điều khiển quản trị</h1>
        <p>{error}</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="admin-state-panel" aria-live="polite">
        <h1>Tổng quan</h1>
        <p>Đang tải tổng quan...</p>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Tổng quan</h1>
          <p>Số liệu tài khoản và lớp học hiện có trong hệ thống.</p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <section className="admin-stat-card">
          <span className="admin-stat-value">{stats.users}</span>
          <strong>Tổng số tài khoản</strong>
        </section>
        <section className="admin-stat-card">
          <span className="admin-stat-value">{stats.teachers}</span>
          <strong>Tổng số giáo viên</strong>
        </section>
        <section className="admin-stat-card">
          <span className="admin-stat-value">{stats.students}</span>
          <strong>Tổng số học sinh</strong>
        </section>
        <section className="admin-stat-card">
          <span className="admin-stat-value">{stats.classes}</span>
          <strong>Tổng số lớp học</strong>
        </section>
      </div>

      <section className="admin-panel admin-quick-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Truy cập nhanh</h2>
            <p>Đi đến các công việc quản trị thường dùng.</p>
          </div>
        </div>

        <div className="admin-quick-links">
          <Link className="admin-quick-link" to="/admin/accounts">
            <span>Quản lý tài khoản</span>
          </Link>
          <Link className="admin-quick-link" to="/admin/classes">
            <span>Quản lý lớp học</span>
          </Link>
        </div>
      </section>
    </section>
  )
}

export default AdminDashboardPage
