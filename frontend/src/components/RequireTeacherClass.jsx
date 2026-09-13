import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'

import { useAuth } from '../contexts/useAuth.js'
import { canTeacherAccessClass } from '../data/mockClassStore.js'

function RequireTeacherClass() {
  const { user } = useAuth()
  const { classId } = useParams()
  const location = useLocation()

  if (!canTeacherAccessClass(user, classId)) {
    return <Navigate replace state={{ from: location.pathname }} to="/teacher" />
  }

  return <Outlet />
}

export default RequireTeacherClass
