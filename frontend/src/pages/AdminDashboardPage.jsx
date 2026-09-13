import { useMemo } from 'react'

import { ADMIN_STATE, getAdminWorkspace } from '../data/mockAdminStore.js'
import { ROLES } from '../data/mockAuthStore.js'

function AdminDashboardPage() {
  const snapshot = getAdminWorkspace(ADMIN_STATE.SUCCESS)

  const stats = useMemo(() => {
    if (snapshot.status !== 'success') {
      return { users: 0, teachers: 0, students: 0, classes: 0 }
    }

    const users = snapshot.data.users ?? []
    const classes = snapshot.data.classes ?? []

    return {
      users: users.length,
      teachers: users.filter((user) => user.role === ROLES.TEACHER).length,
      students: users.filter((user) => user.role === ROLES.STUDENT).length,
      classes: classes.length,
    }
  }, [snapshot])

  if (snapshot.status === 'error') {
    return (
      <section className="admin-empty-panel">
        <p className="state-kicker">Quản trị</p>
        <h1>Bảng điều khiển Admin</h1>
        <p>{snapshot.message}</p>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="state-kicker">Admin</p>
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
