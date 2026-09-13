import { Navigate, Outlet } from 'react-router-dom'

import { canAccessRole, getRoleHome } from '../data/mockSession.js'
import PageErrorState from './PageErrorState.jsx'

function RequireRole({ currentUser, requiredRole }) {
  if (canAccessRole(currentUser, requiredRole)) {
    return <Outlet />
  }

  const home = getRoleHome(currentUser)

  if (home) {
    return <Navigate to={home} replace />
  }

  return (
    <PageErrorState
      kicker="Quyền truy cập"
      title="Không thể truy cập"
      message="Chọn vai trò demo để tiếp tục."
    />
  )
}

export default RequireRole
