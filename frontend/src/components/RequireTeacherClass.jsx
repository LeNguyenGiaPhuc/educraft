import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import PageErrorState from './PageErrorState.jsx'
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
    return (
      <main className="page-content">
        <div className="page-container">
          <section className="state-panel" aria-live="polite" aria-busy="true">
            <p className="state-kicker">Lớp học</p>
            <h1>Đang tải lớp học...</h1>
            <p>Đang kiểm tra quyền truy cập và danh sách học sinh.</p>
          </section>
        </div>
      </main>
    )
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
