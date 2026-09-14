import { AppError } from '../../common/errors.js'

const ASSIGNMENT_COLUMNS = [
  'id',
  'class_id',
  'created_by',
  'title',
  'due_at',
  'coverage_threshold',
  'status',
  'created_at',
  'updated_at',
].join(',')

function requireTeacherContext(auth) {
  if (
    auth?.profile?.role !== 'TEACHER'
    || typeof auth.profile.id !== 'string'
    || !auth.profile.id
    || !auth.supabase
  ) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
  }

  return {
    supabase: auth.supabase,
    teacherId: auth.profile.id,
  }
}

function throwDatabaseError(result) {
  if (result.error) throw result.error
}

export function createAssignmentService({ now = Date.now } = {}) {
  function assertOpenBeforeDeadline(assignment) {
    if (assignment.status !== 'OPEN') return

    const dueAt = Date.parse(assignment.due_at)
    const currentTime = Number(now())

    if (!Number.isFinite(dueAt) || !Number.isFinite(currentTime) || currentTime >= dueAt) {
      throw new AppError(
        422,
        'ASSIGNMENT_DEADLINE_REACHED',
        'Bài kiểm tra đang mở phải có hạn nộp trong tương lai.',
      )
    }
  }

  async function getManagedClass(supabase, teacherId, classId) {
    const result = await supabase
      .from('classes')
      .select('id,teacher_id')
      .eq('id', classId)
      .maybeSingle()

    throwDatabaseError(result)

    if (!result.data) {
      throw new AppError(404, 'CLASS_NOT_FOUND', 'Không tìm thấy lớp học.')
    }
    if (result.data.teacher_id !== teacherId) {
      throw new AppError(403, 'CLASS_FORBIDDEN', 'Bạn không được phân công cho lớp học này.')
    }

    return result.data
  }

  async function getManagedAssignment(supabase, teacherId, assignmentId) {
    const result = await supabase
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('id', assignmentId)
      .maybeSingle()

    throwDatabaseError(result)

    if (!result.data) {
      throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy bài kiểm tra.')
    }

    await getManagedClass(supabase, teacherId, result.data.class_id)
    return result.data
  }

  return {
    async listAssignmentsForClass(auth, classId) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      await getManagedClass(supabase, teacherId, classId)

      const result = await supabase
        .from('assignments')
        .select(ASSIGNMENT_COLUMNS)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })

      throwDatabaseError(result)
      return result.data ?? []
    },

    async getAssignment(auth, assignmentId) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      return getManagedAssignment(supabase, teacherId, assignmentId)
    },

    async createAssignment(auth, classId, input) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      await getManagedClass(supabase, teacherId, classId)

      const assignment = {
        class_id: classId,
        created_by: teacherId,
        title: input.title,
        due_at: input.due_at,
        coverage_threshold: input.coverage_threshold,
        status: input.status,
      }
      assertOpenBeforeDeadline(assignment)

      const result = await supabase
        .from('assignments')
        .insert(assignment)
        .select(ASSIGNMENT_COLUMNS)
        .single()

      throwDatabaseError(result)
      return result.data
    },

    async updateAssignment(auth, assignmentId, input) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      const current = await getManagedAssignment(supabase, teacherId, assignmentId)
      assertOpenBeforeDeadline({ ...current, ...input })

      const result = await supabase
        .from('assignments')
        .update(input)
        .eq('id', assignmentId)
        .select(ASSIGNMENT_COLUMNS)
        .single()

      throwDatabaseError(result)
      return result.data
    },

    async deleteAssignment(auth, assignmentId) {
      const { supabase, teacherId } = requireTeacherContext(auth)
      await getManagedAssignment(supabase, teacherId, assignmentId)

      const result = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .select(ASSIGNMENT_COLUMNS)
        .single()

      throwDatabaseError(result)
      return result.data
    },
  }
}
