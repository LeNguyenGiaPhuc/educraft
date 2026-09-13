import { getStoredAssignments } from './mockAssignmentStore.js'
import { getTeacherClassesForUser } from './mockClassStore.js'
import { getClassStudentCount } from './mockStudentStore.js'

export function getDashboardSnapshot(state = 'success', storage, currentUser) {
  if (state === 'loading') {
    return { status: 'loading' }
  }

  if (state === 'empty') {
    return { status: 'success', data: [] }
  }

  if (state === 'error') {
    return {
      status: 'error',
      message: 'Không thể tải danh sách lớp lúc này.',
    }
  }

  const data = getTeacherClassesForUser(currentUser, storage).map((classroom) => ({
    ...classroom,
    studentCount: getClassStudentCount(classroom.id, classroom.studentCount, storage),
    assignmentCount:
      classroom.assignmentCount + getStoredAssignments(classroom.id, storage).length,
  }))

  return { status: 'success', data }
}
