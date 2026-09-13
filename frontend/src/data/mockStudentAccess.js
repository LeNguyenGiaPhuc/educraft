import { getAssignmentSnapshot, getClassDetailSnapshot } from './mockClassDetail.js'
import { canAccessRole } from './mockSession.js'

export function isStudentInClass(user, classId, storage) {
  if (!canAccessRole(user, 'student')) {
    return false
  }

  const snapshot = getClassDetailSnapshot(classId, storage)

  return snapshot.status === 'success'
    && snapshot.data.students.some((student) => student.code === user.studentId)
}

export function getStudentAssignmentSnapshot(user, assignmentId, storage) {
  const unavailable = {
    status: 'error',
    message: 'Bài kiểm tra không khả dụng.',
  }

  if (!canAccessRole(user, 'student')) {
    return unavailable
  }

  const snapshot = getAssignmentSnapshot(assignmentId, storage)

  if (
    snapshot.status !== 'success'
    || !isStudentInClass(user, snapshot.data.classroom.id, storage)
  ) {
    return unavailable
  }

  return snapshot
}
