import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { getCampusStudioSurface } from '../data/campusStudioRoute.js'
import { getRoleHome, ROLES } from '../services/authService.js'
import '../styles/student-kinetic.css'
import '../styles/campus-studio.css'

function navigationClassName({ isActive }) {
  return `nav-link${isActive ? ' nav-link-active' : ''}`
}

function AppShell({ children }) {
  const { logout, user } = useAuth()
  const { pathname } = useLocation()
  const homePath = getRoleHome(user?.role)
  const isTeacher = user?.role === ROLES.TEACHER
  const studioSurface = getCampusStudioSurface(pathname)
  const isCampusStudio = Boolean(studioSurface)
  const isTeacherDashboardStudio = studioSurface === 'teacher-dashboard'
  const roleShellClass = isTeacher && !isTeacherDashboardStudio ? 'teacher-shell teacher-kinetic-shell'
    : isTeacherDashboardStudio ? 'teacher-kinetic-shell'
      : user?.role === ROLES.STUDENT ? 'student-shell student-kinetic-shell' : 'student-shell'
  const hasPrimaryNavigation = user?.role === ROLES.ADMIN
  const initials = (user?.name ?? 'EduCraft')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className={`app-shell ${roleShellClass}${isCampusStudio ? ` campus-studio-shell campus-studio-${studioSurface}` : ''}`}>
      <header className={`site-header${isTeacher && !isCampusStudio ? ' teacher-sidebar teacher-kinetic-header' : ''}${isCampusStudio ? ' campus-studio-command-bar' : ''}`}>
        <div className="site-header-inner">
          <Link className="brand" to={homePath} aria-label="EduCraft">
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <span>
              EduCraft
              {isCampusStudio ? (
                <small className="shell-role-label cs-command-context">
                  {studioSurface === 'student-dashboard' ? 'Học sinh · Campus Board' : studioSurface === 'teacher-dashboard' ? 'Giáo viên · Tổng quan lớp' : 'Giáo viên · Duyệt bài'}
                </small>
              ) : isTeacher && <small className="shell-role-label">Không gian giáo viên</small>}
            </span>
          </Link>

          {hasPrimaryNavigation && (
            <nav className="primary-nav" aria-label="Điều hướng chính">
              {user?.role === ROLES.ADMIN && (
                <NavLink className={navigationClassName} end to="/admin">
                  Quản trị
                </NavLink>
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
        {children ?? <Outlet />}
      </div>
    </div>
  )
}

export default AppShell
