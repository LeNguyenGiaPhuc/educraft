import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import '../styles/admin-kinetic.css'
import { useAuth } from '../contexts/useAuth.js'

const adminNavigation = [
  { label: 'Tổng quan', to: '/admin', end: true },
  { label: 'Tài khoản', to: '/admin/accounts' },
  { label: 'Lớp học', to: '/admin/classes' },
]

function adminNavClassName({ isActive }) {
  return `admin-command-link${isActive ? ' admin-command-link-active' : ''}`
}

function getAdminPageContext(pathname) {
  if (pathname.startsWith('/admin/accounts')) return 'Admin · Tài khoản'
  if (/^\/admin\/classes\/[^/]+/.test(pathname)) return 'Admin · Chi tiết lớp'
  if (pathname.startsWith('/admin/classes')) return 'Admin · Lớp học'
  return 'Admin · Tổng quan'
}

function AdminShell({ children }) {
  const { logout, user } = useAuth()
  const { pathname } = useLocation()
  const initials = (user?.name ?? 'AD')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className="admin-shell admin-kinetic">
      <header aria-label="EduCraft Operations Desk" className="admin-command-bar">
        <div className="admin-command-inner">
          <Link
            aria-label="EduCraft - Tổng quan quản trị"
            className="admin-command-brand"
            to="/admin"
          >
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <div>
              <strong>EduCraft</strong>
              <span className="admin-command-context">{getAdminPageContext(pathname)}</span>
            </div>
          </Link>

          <nav className="admin-command-nav" aria-label="Điều hướng quản trị">
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

          <div className="admin-command-actions">
            <div className="admin-command-user">
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
        </div>
      </header>

      <main className="admin-main">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}

export default AdminShell
