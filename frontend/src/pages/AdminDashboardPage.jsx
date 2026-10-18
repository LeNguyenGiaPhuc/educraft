import { Link } from 'react-router-dom'

import { useEffect, useState } from 'react'

import { fetchDashboardStats } from '../data/adminDashboard.js'
import { ApiError } from '../services/apiClient.js'

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
          <p>Sổ đăng ký tài khoản và lớp học — số liệu tổng hợp từ hệ thống.</p>
        </div>
      </div>

      <div className="ar-overview">
        <section className="ar-register-volume">
          <div className="ar-volume-tab">Tài khoản</div>
          <div className="ar-volume-content"><h2>Sổ tài khoản</h2><dl className="ar-stat-ledger">
            <div><dt>Tài khoản</dt><dd>{stats.users}</dd></div>
            <div><dt>Giáo viên</dt><dd>{stats.teachers}</dd></div>
            <div><dt>Học sinh</dt><dd>{stats.students}</dd></div>
          </dl><Link className="button button-primary" to="/admin/accounts">Mở sổ tài khoản →</Link></div>
        </section>
        <section className="ar-register-volume ar-volume-classes">
          <div className="ar-volume-tab">Lớp học</div>
          <div className="ar-volume-content"><h2>Hồ sơ lớp học</h2><dl className="ar-stat-ledger"><div><dt>Lớp học</dt><dd>{stats.classes}</dd></div></dl>
          <p>Phân công giáo viên, quản lý thành viên và nhập danh sách học sinh.</p><Link className="button button-primary" to="/admin/classes">Mở danh mục lớp →</Link></div>
        </section>
      </div>
    </section>
  )
}

export default AdminDashboardPage
