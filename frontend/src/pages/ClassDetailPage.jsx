import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import ClassDetailView from '../components/teacher/ClassDetailView.jsx'
import { loadClassDetail, classDetailForRoute } from '../data/classDetailLoading.js'
import { createSubmissionCountStore } from '../data/submissionCountStore.js'
import { assignmentService } from '../services/assignmentService.js'
import { submissionService } from '../services/submissionService.js'
import { teacherClassService } from '../services/teacherClassService.js'

function requestedTab() {
  if (typeof window === 'undefined') return 'assignments'
  return new URLSearchParams(window.location.search).get('tab') === 'students' ? 'students' : 'assignments'
}
function ClassDetailPage() {
  const { classId = '10A1' } = useParams()
  const [activeTab, setActiveTab] = useState(requestedTab)
  const outletContext = useOutletContext()
  const contextClassroom = outletContext?.classroom ?? null
  const [countStore] = useState(() => createSubmissionCountStore({ listSubmissions: id => submissionService.listSubmissions(id) }))
  const [state, setState] = useState({ status: 'loading', classId, classroom: null, assignments: [] })
  useEffect(() => {
    let isMounted = true
    const classroomRequest = contextClassroom?.id === classId ? Promise.resolve(contextClassroom) : teacherClassService.getClass(classId)
    loadClassDetail(classId, classroomRequest, assignmentService.listAssignments(classId))
      .then((nextState) => {
        if (isMounted) setState(nextState)
      })
      .catch((error) => {
        if (isMounted) setState({ status: 'error', classId, classroom: null, assignments: [], message: error?.message ?? 'Không thể tải dữ liệu lớp học.' })
      })
    return () => { isMounted = false }
  }, [classId, contextClassroom])
  return <ClassDetailView key={classId} state={classDetailForRoute(state, classId)} activeTab={activeTab} onTabChange={setActiveTab} countStore={countStore} />
}
export default ClassDetailPage
