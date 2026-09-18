import { Link, NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'

const adminNavigation = [
  { label: 'Tổng quan', to: '/admin', end: true },
  { label: 'Quản lý tài khoản', to: '/admin/accounts' },
  { label: 'Quản lý lớp học', to: '/admin/classes' },
]

function adminNavClassName({ isActive }) {
  return `admin-nav-link${isActive ? ' admin-nav-link-active' : ''}`
}

function AdminShell() {
  const { logout, user } = useAuth()
  const initials = (user?.name ?? 'AD')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Điều hướng quản trị">
        <div>
            <Link
              aria-label="EduCraft - Tổng quan quản trị"
              className="admin-sidebar-brand"
              to="/admin"
            >
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <div>
              <strong>EduCraft</strong>
              <span className="admin-role-label">Không gian quản trị</span>
            </div>
          </Link>

          <nav className="admin-sidebar-nav">
            {adminNavigation.map((item) => (
              <NavLink
                className={adminNavClassName}
                end={item.end}
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-user-pill">
            <span>{initials}</span>
            <div>
              <strong>{user?.name ?? 'Quản trị viên'}</strong>
              <small>{user?.username ?? 'admin'}</small>
            </div>
          </div>
          <button className="logout-button" onClick={logout} type="button">
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminShell
