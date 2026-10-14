import { mapClassAssignment } from './classAssignmentArchive.js'

export async function loadClassDetail(classId, classroomRequest, assignmentsRequest) {
  const [classroom, assignments] = await Promise.all([classroomRequest, assignmentsRequest])
  return { status: 'success', classId, classroom, assignments: (assignments ?? []).map(item => mapClassAssignment(item)) }
}

// Render guard runs before effects: data from A cannot flash on route B.
export function classDetailForRoute(state, classId) {
  return state.classId === classId ? state : { status: 'loading', classId, classroom: null, assignments: [] }
}
