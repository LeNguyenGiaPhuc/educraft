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

          <nav className="primary-nav" aria-label="Dieu huong chinh">
            {user?.role === ROLES.ADMIN && (
              <NavLink className={navigationClassName} end to="/admin">
                Admin
              </NavLink>
            )}

            {user?.role === ROLES.TEACHER && (
              <>
                <NavLink className={navigationClassName} end to="/teacher">
                  Tong quan
                </NavLink>
                <NavLink className={navigationClassName} to="/assignments/new">
                  Tao bai kiem tra
                </NavLink>
              </>
            )}

            {user?.role === ROLES.STUDENT && (
              <NavLink className={navigationClassName} end to="/student">
                Hoc sinh
              </NavLink>
            )}
          </nav>

          <div className="profile-area">
            <div className="profile-monogram" aria-label={user?.name ?? 'Nguoi dung'}>
              {initials}
            </div>
            <button className="logout-button" onClick={logout} type="button">
              Dang xuat
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export default AppShell
