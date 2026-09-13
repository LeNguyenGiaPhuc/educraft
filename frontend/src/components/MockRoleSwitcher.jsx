import { useNavigate } from 'react-router-dom'

import { getMockUser, getRoleHome } from '../data/mockSession.js'

function MockRoleSwitcher({ role, onRoleChange }) {
  const navigate = useNavigate()

  function selectRole(nextRole) {
    const home = getRoleHome(getMockUser(nextRole))

    if (!home) {
      return
    }

    onRoleChange(nextRole)
    navigate(home, { replace: true })
  }

  return (
    <div className="class-management-row" role="group" aria-label="Demo role">
      <strong>Chế độ demo</strong>
      <div className="class-management-row-actions">
        <button
          aria-pressed={role === 'teacher'}
          className={`button ${role === 'teacher' ? 'button-primary' : 'button-outline'}`}
          onClick={() => selectRole('teacher')}
          type="button"
        >
          Giáo viên
        </button>
        <button
          aria-pressed={role === 'student'}
          className={`button ${role === 'student' ? 'button-primary' : 'button-outline'}`}
          onClick={() => selectRole('student')}
          type="button"
        >
          Học sinh
        </button>
      </div>
    </div>
  )
}

export default MockRoleSwitcher
