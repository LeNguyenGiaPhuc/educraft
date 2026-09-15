import { AppError } from '../../common/errors.js'

const CLASS_COLUMNS = [
  'id',
  'code',
  'subject',
  'semester',
  'school_year',
  'teacher_id',
  'status',
  'created_at',
  'updated_at',
].join(',')

const STUDENT_COLUMNS = 'id,email,username,full_name,role,status,student_code'

function requireTeacherContext(auth) {
  if (
    auth?.profile?.role !== 'TEACHER'
    || auth.profile.status !== 'ACTIVE'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem lớp học.')
  }

  return {
    teacherId: auth.profile.id,
    supabase: auth.supabase,
  }
}

function throwDatabaseError(result) {
  if (result.error) throw result.error
}

function countRowsByClass(rows = []) {
  const counts = new Map()

  for (const row of rows) {
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1)
  }

  return counts
}

async function readAssignmentCounts(supabase, classIds) {
  if (classIds.length === 0) return new Map()

  const result = await supabase
    .from('assignments')
    .select('class_id')
    .in('class_id', classIds)

  throwDatabaseError(result)
  return countRowsByClass(result.data)
}

function mapStudent(member) {
  return {
    id: member.student_id,
    email: member.student?.email ?? null,
    username: member.student?.username ?? null,
    full_name: member.student?.full_name ?? null,
    role: member.student?.role ?? null,
    status: member.student?.status ?? null,
    student_code: member.student?.student_code ?? null,
    class_id: member.class_id,
    student_number: member.student_number,
    joined_at: member.joined_at,
  }
}

export function createTeacherClassService() {
  async function readCounts(supabase, classIds) {
    if (classIds.length === 0) {
      return { students: new Map(), assignments: new Map() }
    }

    const [membersResult, assignmentsResult] = await Promise.all([
      supabase
        .from('class_members')
        .select('class_id')
        .in('class_id', classIds),
      readAssignmentCounts(supabase, classIds),
    ])

    throwDatabaseError(membersResult)

    return {
      students: countRowsByClass(membersResult.data),
      assignments: assignmentsResult,
    }
  }

  async function readAssignedClass(supabase, teacherId, classId) {
    const result = await supabase
      .from('classes')
      .select(CLASS_COLUMNS)
      .eq('id', classId)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    throwDatabaseError(result)

    if (!result.data) {
      throw new AppError(404, 'CLASS_NOT_FOUND', 'Không tìm thấy lớp học được phân công.')
    }

    return result.data
  }

  return {
    async listClasses(auth) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      const result = await supabase
        .from('classes')
        .select(CLASS_COLUMNS)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      throwDatabaseError(result)

      const classes = result.data ?? []
      const counts = await readCounts(supabase, classes.map((classroom) => classroom.id))

      return classes.map((classroom) => ({
        ...classroom,
        student_count: counts.students.get(classroom.id) ?? 0,
        assignment_count: counts.assignments.get(classroom.id) ?? 0,
      }))
    },

    async getClass(auth, classId) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      const classroom = await readAssignedClass(supabase, teacherId, classId)

      const [membersResult, assignmentCounts] = await Promise.all([
        supabase
          .from('class_members')
          .select(`class_id,student_id,student_number,joined_at,student:profiles!class_members_student_id_fkey(${STUDENT_COLUMNS})`)
          .eq('class_id', classId)
          .order('student_number', { ascending: true }),
        readAssignmentCounts(supabase, [classId]),
      ])

      throwDatabaseError(membersResult)

      return {
        ...classroom,
        student_count: membersResult.data?.length ?? 0,
        assignment_count: assignmentCounts.get(classId) ?? 0,
        students: (membersResult.data ?? []).map(mapStudent),
      }
    },
  }
}
