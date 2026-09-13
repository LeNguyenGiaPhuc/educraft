import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'

const adminNavigation = [
  { label: 'Tong quan', to: '/admin', end: true },
  { label: 'Quan ly tai khoan', to: '/admin/accounts' },
  { label: 'Quan ly lop hoc', to: '/admin/classes' },
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
      <aside className="admin-sidebar" aria-label="Dieu huong Admin">
        <div>
          <div className="admin-sidebar-brand">
            <span className="brand-mark" aria-hidden="true">E</span>
            <div>
              <strong>EduCraft</strong>
              <span>Admin</span>
            </div>
          </div>

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
              <strong>{user?.name ?? 'Admin'}</strong>
              <small>{user?.username ?? 'admin'}</small>
            </div>
          </div>
          <button className="logout-button" onClick={logout} type="button">
            Dang xuat
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
