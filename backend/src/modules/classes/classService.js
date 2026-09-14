import { randomBytes } from 'node:crypto'

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

function normalizePersonName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function createClassService({ adminClient } = {}) {
  async function requireAdmin(auth) {
    if (!auth?.profile || auth.profile.role !== 'ADMIN' || auth.profile.status !== 'ACTIVE') {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
    }
  }

  async function ensureClassExists(supabase, classId) {
    const result = await supabase
      .from('classes')
      .select(CLASS_COLUMNS)
      .eq('id', classId)
      .maybeSingle()

    if (result.error) throw result.error
    if (!result.data) {
      throw new AppError(404, 'CLASS_NOT_FOUND', 'Không tìm thấy lớp học.')
    }

    return result.data
  }

  async function ensureTeacher(supabase, teacherId) {
    if (!teacherId) return null

    const result = await supabase
      .from('profiles')
      .select('id,role,status')
      .eq('id', teacherId)
      .maybeSingle()

    if (result.error) throw result.error
    if (!result.data) {
      throw new AppError(404, 'TEACHER_NOT_FOUND', 'Không tìm thấy giáo viên.')
    }
    if (result.data.role !== 'TEACHER') {
      throw new AppError(422, 'INVALID_TEACHER_ROLE', 'Tài khoản không phải giáo viên.')
    }
    if (result.data.status !== 'ACTIVE') {
      throw new AppError(422, 'TEACHER_NOT_ACTIVE', 'Giáo viên chưa ở trạng thái hoạt động.')
    }

    return result.data
  }

  async function ensureStudent(supabase, studentId) {
    const result = await supabase
      .from('profiles')
      .select('id,role,status')
      .eq('id', studentId)
      .maybeSingle()

    if (result.error) throw result.error
    if (!result.data) {
      throw new AppError(404, 'STUDENT_NOT_FOUND', 'Không tìm thấy học sinh.')
    }
    if (result.data.role !== 'STUDENT') {
      throw new AppError(422, 'INVALID_STUDENT_ROLE', 'Tài khoản không phải học sinh.')
    }

    return result.data
  }

  async function ensureClassCodeUnique(supabase, code, excludeId = null) {
    const result = await supabase
      .from('classes')
      .select('id,code')
      .ilike('code', code)
      .limit(1)

    if (result.error) throw result.error
    if (result.data?.some((row) => row.id !== excludeId)) {
      throw new AppError(409, 'CLASS_CODE_CONFLICT', 'Mã lớp đã tồn tại.')
    }
  }

  async function createAuthUser(row) {
    if (!adminClient?.auth?.admin?.createUser) {
      throw new AppError(500, 'AUTH_ADMIN_NOT_CONFIGURED', 'Dịch vụ tài khoản chưa sẵn sàng.')
    }

    let result
    try {
      result = await adminClient.auth.admin.createUser({
        email: row.email,
        password: randomBytes(18).toString('base64url'),
        email_confirm: true,
        user_metadata: { full_name: row.name },
      })
    } catch {
      throw new AppError(500, 'AUTH_CREATE_FAILED', 'Không thể tạo tài khoản đăng nhập.')
    }

    if (result?.error || !result?.data?.user?.id) {
      if (result?.error?.code === 'email_exists' || result?.error?.status === 422) {
        throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
      }
      throw new AppError(500, 'AUTH_CREATE_FAILED', 'Không thể tạo tài khoản đăng nhập.')
    }

    return result.data.user
  }

  async function rollbackAuthUsers(userIds) {
    if (userIds.length === 0) return
    if (!adminClient?.auth?.admin?.deleteUser) {
      throw new AppError(500, 'IMPORT_ROLLBACK_FAILED', 'Không thể hoàn tác tài khoản import.')
    }

    for (const userId of userIds) {
      let result
      try {
        result = await adminClient.auth.admin.deleteUser(userId)
      } catch {
        throw new AppError(500, 'IMPORT_ROLLBACK_FAILED', 'Không thể hoàn tác tài khoản import.')
      }
      if (result?.error) {
        throw new AppError(500, 'IMPORT_ROLLBACK_FAILED', 'Không thể hoàn tác tài khoản import.')
      }
    }
  }

  function mapImportRpcError(error) {
    const message = String(error?.message ?? '')
    const knownErrors = {
      IMPORT_NOT_ADMIN: [403, 'FORBIDDEN', 'Bạn không có quyền import học sinh.'],
      CLASS_NOT_FOUND: [404, 'CLASS_NOT_FOUND', 'Không tìm thấy lớp học.'],
      IMPORT_ROLE_CONFLICT: [409, 'IMPORT_ROLE_CONFLICT', 'Email đã thuộc tài khoản không phải học sinh.'],
      IMPORT_NAME_CONFLICT: [409, 'IMPORT_NAME_CONFLICT', 'Họ tên không khớp với tài khoản học sinh hiện có.'],
      STUDENT_NUMBER_CONFLICT: [409, 'STUDENT_NUMBER_CONFLICT', 'Số thứ tự học sinh đã tồn tại trong lớp.'],
      STUDENT_ALREADY_IN_CLASS: [409, 'STUDENT_ALREADY_IN_CLASS', 'Học sinh đã thuộc lớp này.'],
    }
    const details = knownErrors[message]
    if (details) return new AppError(...details)
    return new AppError(500, 'IMPORT_FAILED', 'Không thể hoàn tất import học sinh.')
  }

  return {
    async listClasses(auth, query = {}) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      let builder = supabase
        .from('classes')
        .select(CLASS_COLUMNS)

      if (query.search) {
        builder = builder.or(`code.ilike.%${query.search}%, subject.ilike.%${query.search}%`)
      }
      if (query.status) {
        builder = builder.eq('status', query.status)
      }

      const result = await builder.order('created_at', { ascending: false })
      if (result.error) throw result.error
      return result.data ?? []
    },

    async getClass(auth, classId) {
      await requireAdmin(auth)
      return ensureClassExists(auth.supabase, classId)
    },

    async listStudents(auth, classId) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)

      const result = await supabase
        .from('class_members')
        .select('class_id,student_id,student_number,joined_at,student:profiles!class_members_student_id_fkey(id,email,username,full_name,role,status,student_code)')
        .eq('class_id', classId)
        .order('student_number', { ascending: true })

      if (result.error) throw result.error
      return (result.data ?? []).map((member) => ({
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
      }))
    },

    async createClass(auth, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassCodeUnique(supabase, input.code)
      await ensureTeacher(supabase, input.teacher_id)
      const payload = {
        code: input.code.trim(),
        subject: input.subject.trim(),
        semester: input.semester.trim(),
        school_year: input.school_year.trim(),
        teacher_id: input.teacher_id ?? null,
        status: input.status ?? 'ACTIVE',
      }

      const result = await supabase
        .from('classes')
        .insert(payload)
        .select(CLASS_COLUMNS)
        .single()

      if (result.error) {
        if (result.error.code === '23505') {
          throw new AppError(409, 'CLASS_CODE_CONFLICT', 'Mã lớp đã tồn tại.')
        }
        throw result.error
      }

      return result.data
    },

    async updateClass(auth, classId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)
      if (input.code) {
        await ensureClassCodeUnique(supabase, input.code, classId)
      }
      if (Object.hasOwn(input, 'teacher_id')) {
        await ensureTeacher(supabase, input.teacher_id)
      }

      const payload = {}
      for (const [key, value] of Object.entries(input)) {
        if (key === 'code') payload.code = value.trim()
        else if (key === 'subject') payload.subject = value.trim()
        else if (key === 'semester') payload.semester = value.trim()
        else if (key === 'school_year') payload.school_year = value.trim()
        else payload[key] = value
      }

      const result = await supabase
        .from('classes')
        .update(payload)
        .eq('id', classId)
        .select(CLASS_COLUMNS)
        .single()

      if (result.error) {
        if (result.error.code === '23505') {
          throw new AppError(409, 'CLASS_CODE_CONFLICT', 'Mã lớp đã tồn tại.')
        }
        throw result.error
      }

      return result.data
    },

    async deleteClass(auth, classId) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)
      const result = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
      if (result.error) throw result.error
      return null
    },

    async assignTeacher(auth, classId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)
      await ensureTeacher(supabase, input.teacher_id)

      const result = await supabase
        .from('classes')
        .update({ teacher_id: input.teacher_id })
        .eq('id', classId)
        .select(CLASS_COLUMNS)
        .single()

      if (result.error) throw result.error
      return result.data
    },

    async addStudent(auth, classId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)
      await ensureStudent(supabase, input.student_id)

      const duplicateResult = await supabase
        .from('class_members')
        .select('class_id,student_id')
        .eq('class_id', classId)
        .eq('student_id', input.student_id)
        .maybeSingle()

      if (duplicateResult.error) throw duplicateResult.error
      if (duplicateResult.data) {
        throw new AppError(409, 'STUDENT_ALREADY_IN_CLASS', 'Học sinh đã thuộc lớp này.')
      }

      const studentNumberResult = await supabase
        .from('class_members')
        .select('class_id,student_number')
        .eq('class_id', classId)
        .eq('student_number', input.student_number)
        .maybeSingle()

      if (studentNumberResult.error) throw studentNumberResult.error
      if (studentNumberResult.data) {
        throw new AppError(409, 'STUDENT_NUMBER_CONFLICT', 'Số thứ tự học sinh đã tồn tại trong lớp.')
      }

      const result = await supabase
        .from('class_members')
        .insert({
          class_id: classId,
          student_id: input.student_id,
          student_number: input.student_number.trim(),
        })
        .select('class_id,student_id,student_number,joined_at')
        .single()

      if (result.error) {
        if (result.error.code === '23505') {
          const code = result.error.message?.includes('student_number_unique')
            ? 'STUDENT_NUMBER_CONFLICT'
            : 'STUDENT_ALREADY_IN_CLASS'
          throw new AppError(409, code, 'Duplicate class membership or student number.')
        }
        throw result.error
      }

      return result.data
    },

    async removeStudent(auth, classId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)
      const result = await supabase
        .from('class_members')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', input.student_id)
        .select('class_id,student_id,student_number')
        .single()

      if (result.error?.code === 'PGRST116') {
        throw new AppError(404, 'STUDENT_NOT_IN_CLASS', 'Học sinh không thuộc lớp này.')
      }
      if (result.error) throw result.error
      return result.data
    },

    async importStudents(auth, classId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassExists(supabase, classId)

      const normalizedRows = input.students.map((row) => ({
        studentNumber: String(row.studentNumber ?? '').trim(),
        name: String(row.name ?? '').trim(),
        email: String(row.email ?? '').trim().toLowerCase(),
      }))

      const seenEmail = new Set()
      const seenNumber = new Set()
      const invalidRows = []
      for (const row of normalizedRows) {
        if (!row.studentNumber || row.studentNumber.length > 20) {
          invalidRows.push({ email: row.email, error: 'STUDENT_NUMBER_INVALID' })
          continue
        }
        if (!row.name || row.name.length > 120) {
          invalidRows.push({ email: row.email, error: 'NAME_INVALID' })
          continue
        }
        if (seenEmail.has(row.email)) {
          invalidRows.push({ email: row.email, error: 'EMAIL_DUPLICATE_IN_FILE' })
          continue
        }
        if (seenNumber.has(row.studentNumber)) {
          invalidRows.push({ email: row.email, error: 'STUDENT_NUMBER_CONFLICT' })
          continue
        }
        seenEmail.add(row.email)
        seenNumber.add(row.studentNumber)
      }

      if (invalidRows.length > 0) {
        throw new AppError(409, 'IMPORT_VALIDATION_ERROR', 'Danh sách học sinh import không hợp lệ.', {
          rows: invalidRows,
        })
      }

      const profileResult = await supabase
        .from('profiles')
        .select('id,email,role,status,full_name')
        .in('email', normalizedRows.map((row) => row.email))
      if (profileResult.error) throw profileResult.error

      const memberResult = await supabase
        .from('class_members')
        .select('student_id,student_number')
        .eq('class_id', classId)
      if (memberResult.error) throw memberResult.error

      const profilesByEmail = new Map((profileResult.data ?? []).map((profile) => [profile.email.toLowerCase(), profile]))
      const membersByStudent = new Map((memberResult.data ?? []).map((member) => [member.student_id, member]))
      const usedNumbers = new Set((memberResult.data ?? []).map((member) => member.student_number))
      const newRows = []
      const rowsToAssign = []
      let skipped = 0

      for (const row of normalizedRows) {
        const existingProfile = profilesByEmail.get(row.email)
        if (!existingProfile) {
          newRows.push(row)
          continue
        }
        if (existingProfile.role !== 'STUDENT') {
          throw new AppError(409, 'IMPORT_ROLE_CONFLICT', 'Email đã thuộc tài khoản không phải học sinh.')
        }
        if (normalizePersonName(existingProfile.full_name) !== normalizePersonName(row.name)) {
          throw new AppError(409, 'IMPORT_NAME_CONFLICT', 'Họ tên không khớp với tài khoản học sinh hiện có.')
        }
        if (membersByStudent.has(existingProfile.id)) {
          skipped += 1
          continue
        }
        if (usedNumbers.has(row.studentNumber)) {
          throw new AppError(409, 'STUDENT_NUMBER_CONFLICT', 'Số thứ tự học sinh đã tồn tại trong lớp.')
        }
        rowsToAssign.push({ row, profileId: existingProfile.id })
      }

      for (const row of newRows) {
        if (usedNumbers.has(row.studentNumber)) {
          throw new AppError(409, 'STUDENT_NUMBER_CONFLICT', 'Số thứ tự học sinh đã tồn tại trong lớp.')
        }
        rowsToAssign.push({ row })
      }

      const createdAuthUserIds = []
      try {
        for (const item of rowsToAssign) {
          if (!item.profileId) {
            const authUser = await createAuthUser(item.row)
            item.profileId = authUser.id
            createdAuthUserIds.push(authUser.id)
          }
        }

        if (rowsToAssign.length === 0) {
          return { created: 0, assigned: 0, skipped, memberships: [], authUserIds: [] }
        }

        let rpcResult
        try {
          rpcResult = await supabase.rpc('admin_import_students', {
            target_class_id: classId,
            target_students: rowsToAssign.map(({ row, profileId }) => ({
              profile_id: profileId,
              email: row.email,
              full_name: row.name,
              student_number: row.studentNumber,
            })),
          })
        } catch (error) {
          throw mapImportRpcError(error)
        }
        if (rpcResult.error) throw mapImportRpcError(rpcResult.error)

        return {
          created: rpcResult.data?.created ?? newRows.length,
          assigned: rpcResult.data?.assigned ?? rowsToAssign.length - newRows.length,
          skipped: rpcResult.data?.skipped ?? skipped,
          memberships: rpcResult.data?.memberships ?? [],
          authUserIds: createdAuthUserIds,
        }
      } catch (error) {
        await rollbackAuthUsers(createdAuthUserIds)
        throw error
      }
    },
  }
}
