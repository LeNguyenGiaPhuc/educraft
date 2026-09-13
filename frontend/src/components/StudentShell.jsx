import { Link, NavLink, Outlet } from 'react-router-dom'

function StudentShell({ currentUser }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" to="/student" aria-label="EduCraft - Góc học sinh">
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <span>EduCraft</span>
          </Link>

          <nav className="primary-nav" aria-label="Điều hướng học sinh">
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              end
              to="/student"
            >
              Tổng quan học sinh
            </NavLink>
          </nav>

          <div
            className="profile-monogram"
            aria-label={`Học sinh ${currentUser.name}`}
            title={currentUser.name}
          >
            HS
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export default StudentShell
