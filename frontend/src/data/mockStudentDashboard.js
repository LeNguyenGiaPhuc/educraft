import { getClassDetailSnapshot } from './mockClassDetail.js'
import { getTeacherClasses } from './mockClassStore.js'
import { canAccessRole } from './mockSession.js'
import { isStudentInClass } from './mockStudentAccess.js'

export function getStudentDashboardSnapshot(currentUser, storage) {
  if (!canAccessRole(currentUser, 'student')) {
    return {
      status: 'error',
      message: 'Không thể tải lớp học của học sinh.',
    }
  }

  const data = []

  for (const classroom of getTeacherClasses(storage)) {
    if (!isStudentInClass(currentUser, classroom.id, storage)) {
      continue
    }

    const snapshot = getClassDetailSnapshot(classroom.id, storage)

    if (snapshot.status !== 'success') {
      continue
    }

    const detail = snapshot.data

    // Return only dashboard fields, not the teacher snapshot or class roster.
    data.push({
      id: detail.id,
      name: detail.name,
      semester: detail.semester,
      schoolYear: detail.schoolYear,
      assignments: detail.assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        classId: detail.id,
        className: detail.name,
        dueDate: assignment.dueDate,
        status: assignment.status,
        statusTone: assignment.statusTone,
      })),
    })
  }

  return { status: 'success', data }
}
