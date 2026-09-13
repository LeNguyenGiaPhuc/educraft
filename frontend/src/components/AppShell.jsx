import { Link, NavLink, Outlet } from 'react-router-dom'

function navigationClassName({ isActive }) {
  return `nav-link${isActive ? ' nav-link-active' : ''}`
}

function AppShell() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" to="/" aria-label="EduCraft - Tổng quan">
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            <span>EduCraft</span>
          </Link>

          <nav className="primary-nav" aria-label="Điều hướng chính">
            <NavLink className={navigationClassName} end to="/">
              Tổng quan
            </NavLink>
            <NavLink
              className={navigationClassName}
              to="/assignments/new"
            >
              Tạo bài kiểm tra
            </NavLink>
          </nav>

          <div className="profile-monogram" aria-label="Giáo viên GP">
            GP
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}

export default AppShell
