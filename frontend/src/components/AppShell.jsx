import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { getRoleHome, ROLES } from '../services/authService.js'

function navigationClassName({ isActive }) {
  return `nav-link${isActive ? ' nav-link-active' : ''}`
}

function AppShell() {
  const { logout, user } = useAuth()
  const { pathname } = useLocation()
  const homePath = getRoleHome(user?.role)
  const isTeacher = user?.role === ROLES.TEACHER
  const hasPrimaryNavigation = user?.role === ROLES.ADMIN || isTeacher
  const isTeacherAssignmentRoute = pathname === '/assignments/new'
    || /^\/classes\/[^/]+\/assignments\/new$/.test(pathname)
  const initials = (user?.name ?? 'EduCraft')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className={`app-shell ${isTeacher ? 'teacher-shell teacher-kinetic-shell' : 'student-shell'}`}>
      <header className={`site-header${isTeacher ? ' teacher-sidebar teacher-kinetic-header' : ''}`}>
        <div className="site-header-inner">
          <Link className="brand" to={homePath} aria-label="EduCraft">
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <span>
              EduCraft
              {isTeacher && <small className="shell-role-label">Không gian giáo viên</small>}
            </span>
          </Link>

          {hasPrimaryNavigation && (
            <nav className="primary-nav" aria-label="Điều hướng chính">
              {user?.role === ROLES.ADMIN && (
                <NavLink className={navigationClassName} end to="/admin">
                  Quản trị
                </NavLink>
              )}

              {isTeacher && (
                <>
                  <NavLink className={navigationClassName} end to="/teacher">
                    Tổng quan
                  </NavLink>
                  <NavLink
                    className={({ isActive }) => navigationClassName({
                      isActive: isActive || isTeacherAssignmentRoute,
                    })}
                    aria-current={isTeacherAssignmentRoute ? 'page' : undefined}
                    to="/assignments/new"
                  >
                    Tạo bài kiểm tra
                  </NavLink>
                </>
              )}
            </nav>
          )}

          <div className="profile-area">
            <div className="shell-user">
              <div className="profile-monogram" aria-label={user?.name ?? 'Người dùng'}>
                {initials}
              </div>
              <div className="shell-user-details">
                <strong>{user?.name ?? 'Người dùng'}</strong>
                <small>{isTeacher ? 'Giáo viên' : 'Học sinh'}</small>
              </div>
            </div>
            <button className="logout-button" onClick={logout} type="button">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="shell-content">
        <Outlet />
      </div>
    </div>
  )
}

export default AppShell
