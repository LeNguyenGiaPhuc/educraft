import { Outlet, useParams } from 'react-router-dom'

import { getStudentAssignmentSnapshot } from '../data/mockStudentAccess.js'
import PageErrorState from './PageErrorState.jsx'

function RequireStudentAssignment({ currentUser }) {
  const { assignmentId } = useParams()
  const snapshot = getStudentAssignmentSnapshot(currentUser, assignmentId)

  if (snapshot.status === 'error') {
    return (
      <PageErrorState
        kicker="Bài kiểm tra"
        title="Không thể mở bài kiểm tra"
        message={snapshot.message}
        returnTo="/student"
      />
    )
  }

  return <Outlet key={`${currentUser.id}:${assignmentId}`} />
}

export default RequireStudentAssignment
