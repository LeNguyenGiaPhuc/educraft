import { useEffect, useState } from 'react'

import { adminAccountService } from '../services/adminAccountService.js'
import { adminClassService } from '../services/adminClassService.js'
import { ApiError } from '../services/apiClient.js'
import { ROLES } from '../services/authService.js'

function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, classes: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadStats() {
    setLoading(true)
    setError(null)

    try {
      const [accounts, classes] = await Promise.all([
        adminAccountService.listAccounts(),
        adminClassService.listClasses(),
      ])

      const users = Array.isArray(accounts) ? accounts : []
      const classRows = Array.isArray(classes) ? classes : []

      setStats({
        users: users.length,
        teachers: users.filter((user) => user.role === ROLES.TEACHER).length,
        students: users.filter((user) => user.role === ROLES.STUDENT).length,
        classes: classRows.length,
      })
    } catch (caughtError) {
      const message = caughtError instanceof ApiError ? caughtError.message : caughtError?.message ?? 'Không thể tải tổng quan quản trị.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (error) {
    return (
      <section className="admin-empty-panel">
        <p className="state-kicker">Quản trị</p>
        <h1>Bảng điều khiển quản trị</h1>
        <p>{error}</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="admin-empty-panel">
        <p className="state-kicker">Quản trị</p>
        <h1>Tổng quan</h1>
        <p>Đang tải tổng quan...</p>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="state-kicker">Quản trị</p>
          <h1>Tổng quan</h1>
        </div>
      </div>

      <div className="admin-stat-grid">
        <section>
          <span>{stats.users}</span>
          <strong>Tổng số tài khoản</strong>
        </section>
        <section>
          <span>{stats.teachers}</span>
          <strong>Tổng số giáo viên</strong>
        </section>
        <section>
          <span>{stats.students}</span>
          <strong>Tổng số học sinh</strong>
        </section>
        <section>
          <span>{stats.classes}</span>
          <strong>Tổng số lớp học</strong>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="panel-subtitle">Hoạt động gần đây</span>
            <h2>Hệ thống</h2>
          </div>
        </div>

        <div className="admin-feed">
          <div className="admin-feed-row">
            <span className="admin-feed-icon">•</span>
            <span>Quản lý tài khoản và lớp học</span>
          </div>
          <div className="admin-feed-row">
            <span className="admin-feed-icon">•</span>
            <span>Phân công giáo viên và học sinh</span>
          </div>
          <div className="admin-feed-row">
            <span className="admin-feed-icon">•</span>
            <span>Danh sách lớp và chi tiết học sinh</span>
          </div>
        </div>
      </section>
    </section>
  )
}

export default AdminDashboardPage
