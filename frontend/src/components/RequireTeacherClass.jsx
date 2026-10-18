import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import PageErrorState from './PageErrorState.jsx'
import TeacherClassSkeleton from './teacher/TeacherClassSkeleton.jsx'
import { teacherClassService } from '../services/teacherClassService.js'

function RequireTeacherClass() {
  const { classId } = useParams()
  const [state, setState] = useState({ status: 'loading', classId: null, classroom: null })

  useEffect(() => {
    let isMounted = true

    teacherClassService
      .getClass(classId)
      .then((classroom) => {
        if (isMounted) {
          setState({ status: 'success', classId, classroom })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({
            status: 'error',
            classId,
            classroom: null,
            message: error?.message ?? 'Không thể mở lớp học.',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [classId])

  if (state.classId !== classId || state.status === 'loading') {
    return <TeacherClassSkeleton />
  }

  if (state.status === 'error') {
    return (
      <PageErrorState
        kicker="Lớp học"
        message={state.message}
        returnTo="/teacher"
        title="Không thể mở lớp học"
      />
    )
  }

  return <Outlet context={{ classroom: state.classroom }} />
}

export default RequireTeacherClass
