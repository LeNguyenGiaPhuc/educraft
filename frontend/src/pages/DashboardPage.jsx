import { useCallback, useEffect, useRef, useState } from 'react'
import TeacherOverview from '../components/teacher/TeacherOverview.jsx'
import { teacherClassService } from '../services/teacherClassService.js'

function DashboardPage() {
  const [snapshot, setSnapshot] = useState({ status: 'loading', data: [] })
  const requestIdRef = useRef(0)
  const loadClasses = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setSnapshot((previous) => ({ status: 'loading', data: previous.data }))
    try {
      const data = await teacherClassService.listClasses()
      if (requestId === requestIdRef.current) setSnapshot({ status: 'success', data })
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setSnapshot({ status: 'error', data: [], message: error?.message ?? 'Không thể tải danh sách lớp.' })
      }
    }
  }, [])
  useEffect(() => {
    const requestId = ++requestIdRef.current
    teacherClassService.listClasses()
      .then((data) => {
        if (requestId === requestIdRef.current) setSnapshot({ status: 'success', data })
      })
      .catch((error) => {
        if (requestId === requestIdRef.current) {
          setSnapshot({ status: 'error', data: [], message: error?.message ?? 'Không thể tải danh sách lớp.' })
        }
      })
    return () => { requestIdRef.current += 1 }
  }, [])
  return <TeacherOverview snapshot={snapshot} onRetry={loadClasses} />
}
export default DashboardPage
