import { AppError } from '../../common/errors.js'

const CLASS_COLUMNS = 'id,code,subject,semester,school_year,status'
const ASSIGNMENT_COLUMNS = 'id,class_id,title,due_at,coverage_threshold,status,created_at,updated_at'

function requireStudentContext(auth) {
  if (
    auth?.profile?.role !== 'STUDENT'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem dữ liệu học sinh.')
  }

  return {
    studentId: auth.profile.id,
    supabase: auth.supabase,
  }
}

function throwDatabaseError(result) {
  if (result.error) throw result.error
}

function getRelatedRecord(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function toClassroom(row) {
  const classroom = getRelatedRecord(row.classroom)
  if (!classroom) return null

  return {
    id: classroom.id,
    code: classroom.code,
    subject: classroom.subject,
    semester: classroom.semester,
    school_year: classroom.school_year,
    status: classroom.status,
  }
}

export function createStudentDashboardService() {
  return {
    async getDashboard(auth) {
      const { studentId, supabase } = requireStudentContext(auth)
      const membershipResult = await supabase
        .from('class_members')
        .select(`class_id,student_number,classroom:classes(${CLASS_COLUMNS})`)
        .eq('student_id', studentId)
        .order('student_number', { ascending: true })

      throwDatabaseError(membershipResult)

      const memberships = (membershipResult.data ?? [])
        .map((membership) => ({
          ...membership,
          classroom: toClassroom(membership),
        }))
        .filter((membership) => membership.classroom)

      if (memberships.length === 0) return []

      const classIds = memberships.map((membership) => membership.class_id)
      const assignmentsResult = await supabase
        .from('assignments')
        .select(ASSIGNMENT_COLUMNS)
        .in('class_id', classIds)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })

      throwDatabaseError(assignmentsResult)

      const assignmentsByClass = new Map()
      for (const assignment of assignmentsResult.data ?? []) {
        const assignments = assignmentsByClass.get(assignment.class_id) ?? []
        assignments.push(assignment)
        assignmentsByClass.set(assignment.class_id, assignments)
      }

      return memberships.map((membership) => ({
        ...membership.classroom,
        student_number: membership.student_number,
        assignments: assignmentsByClass.get(membership.class_id) ?? [],
      }))
    },

    async getAssignment(auth, assignmentId) {
      const { supabase } = requireStudentContext(auth)
      const result = await supabase
        .from('assignments')
        .select(`${ASSIGNMENT_COLUMNS},classroom:classes(${CLASS_COLUMNS})`)
        .eq('id', assignmentId)
        .neq('status', 'DRAFT')
        .maybeSingle()

      throwDatabaseError(result)

      if (!result.data) {
        throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy bài kiểm tra.')
      }

      return {
        ...result.data,
        classroom: toClassroom(result.data),
      }
    },
  }
}
