import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import PageErrorState from './PageErrorState.jsx'
import StudentPendingState from './student/StudentPendingState.jsx'
import { studentService } from '../services/studentService.js'

function RequireStudentAssignment({ currentUser }) {
  const { assignmentId } = useParams()
  const [request, setRequest] = useState({
    status: 'loading',
    data: null,
    assignmentId: null,
  })

  useEffect(() => {
    let isMounted = true

    studentService
      .getAssignment(assignmentId)
      .then((assignment) => {
        if (isMounted) setRequest({ status: 'success', data: assignment, assignmentId })
      })
      .catch((error) => {
        if (isMounted) {
          setRequest({
            status: 'error',
            data: null,
            assignmentId,
            message: error.message ?? 'Bài kiểm tra không khả dụng.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [assignmentId])

  const isCurrentRequest = request.assignmentId === assignmentId

  if (!isCurrentRequest || request.status === 'loading') {
    return <StudentPendingState />
  }

  if (request.status === 'error') {
    return (
      <PageErrorState
        kicker="Bài kiểm tra"
        title="Không thể mở bài kiểm tra"
        message={request.message}
        returnTo="/student"
      />
    )
  }

  return (
    <Outlet
      context={{ assignment: request.data }}
      key={`${currentUser?.id ?? 'student'}:${assignmentId}`}
    />
  )
}

export default RequireStudentAssignment
