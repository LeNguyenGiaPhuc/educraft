import { Link, NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { getRoleHome, ROLES } from '../data/mockAuthStore.js'

function navigationClassName({ isActive }) {
  return `nav-link${isActive ? ' nav-link-active' : ''}`
}

function AppShell() {
  const { logout, user } = useAuth()
  const homePath = getRoleHome(user?.role)
  const initials = (user?.name ?? 'EduCraft')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" to={homePath} aria-label="EduCraft">
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <span>EduCraft</span>
          </Link>

          <nav className="primary-nav" aria-label="Điều hướng chính">
            {user?.role === ROLES.ADMIN && (
              <NavLink className={navigationClassName} end to="/admin">
                Quản trị
              </NavLink>
            )}

            {user?.role === ROLES.TEACHER && (
              <>
                <NavLink className={navigationClassName} end to="/teacher">
                  Tổng quan
                </NavLink>
                <NavLink className={navigationClassName} to="/assignments/new">
                  Tạo bài kiểm tra
                </NavLink>
              </>
            )}

            {user?.role === ROLES.STUDENT && (
              <NavLink className={navigationClassName} end to="/student">
                Học sinh
              </NavLink>
            )}
          </nav>

          <div className="profile-area">
            <div className="profile-monogram" aria-label={user?.name ?? 'Người dùng'}>
              {initials}
            </div>
            <button className="logout-button" onClick={logout} type="button">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export default AppShell
