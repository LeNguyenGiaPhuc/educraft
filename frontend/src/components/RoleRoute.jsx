import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { canAccessRole, getRoleHome } from '../services/authService.js'

function RoleRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  if (!canAccessRole(user, allowedRoles)) {
    return <Navigate replace to={getRoleHome(user.role)} />
  }

  return <Outlet />
}

export default RoleRoute
