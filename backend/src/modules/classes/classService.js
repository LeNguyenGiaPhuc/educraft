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

    async createClass(auth, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureClassCodeUnique(supabase, input.code)
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
        if (seenNumber.has(`${classId}:${row.studentNumber}`)) {
          invalidRows.push({ email: row.email, error: 'STUDENT_NUMBER_CONFLICT' })
          continue
        }

        seenEmail.add(row.email)
        seenNumber.add(`${classId}:${row.studentNumber}`)
      }

      if (invalidRows.length > 0) {
        throw new AppError(409, 'IMPORT_VALIDATION_ERROR', 'Danh sách học sinh import không hợp lệ.', {
          rows: invalidRows,
        })
      }

      const authCreatePlan = []
      const createdProfiles = []
      const createdMemberships = []

      for (const row of normalizedRows) {
        const existingProfile = await supabase
          .from('profiles')
          .select('id,email,role,status,full_name')
          .eq('email', row.email)
          .maybeSingle()

        if (existingProfile.error) throw existingProfile.error
        if (existingProfile.data) {
          if (existingProfile.data.role !== 'STUDENT') {
            throw new AppError(409, 'IMPORT_ROLE_CONFLICT', 'Email đã thuộc tài khoản không phải học sinh.')
          }
          if (existingProfile.data.status !== 'ACTIVE' && existingProfile.data.status !== 'PENDING') {
            throw new AppError(409, 'IMPORT_ACCOUNT_STATUS_CONFLICT', 'Tài khoản học sinh không ở trạng thái cho phép.')
          }

          const memberCheck = await supabase
            .from('class_members')
            .select('class_id,student_id')
            .eq('class_id', classId)
            .eq('student_id', existingProfile.data.id)
            .maybeSingle()

          if (memberCheck.error) throw memberCheck.error
          if (memberCheck.data) {
            throw new AppError(409, 'STUDENT_ALREADY_IN_CLASS', 'Học sinh đã thuộc lớp này.')
          }

          const duplicateNumber = await supabase
            .from('class_members')
            .select('class_id,student_number')
            .eq('class_id', classId)
            .eq('student_number', row.studentNumber)
            .maybeSingle()

          if (duplicateNumber.error) throw duplicateNumber.error
          if (duplicateNumber.data) {
            throw new AppError(409, 'STUDENT_NUMBER_CONFLICT', 'Số thứ tự học sinh đã tồn tại trong lớp.')
          }

          const inserted = await supabase
            .from('class_members')
            .insert({ class_id: classId, student_id: existingProfile.data.id, student_number: row.studentNumber })
            .select('class_id,student_id,student_number,joined_at')
            .single()

          if (inserted.error) throw inserted.error
          createdMemberships.push(inserted.data)
          continue
        }

        let authUser = null
        if (adminClient?.auth?.admin?.createUser) {
          authUser = await adminClient.auth.admin.createUser({
            email: row.email,
            password: Math.random().toString(36).slice(-12),
            email_confirm: true,
            user_metadata: { full_name: row.name },
          })
          if (authUser.error) throw authUser.error
          authCreatePlan.push(authUser.data.user.id)
        }

        const newProfile = await supabase
          .from('profiles')
          .insert({
            id: authUser?.data?.user?.id ?? crypto.randomUUID(),
            email: row.email,
            username: `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
            full_name: row.name,
            role: 'STUDENT',
            status: 'PENDING',
            student_code: null,
          })
          .select('id,email,role,status,full_name')
          .single()

        if (newProfile.error) {
          if (newProfile.error.code === '23505') {
            throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
          }
          throw newProfile.error
        }

        createdProfiles.push(newProfile.data)

        const inserted = await supabase
          .from('class_members')
          .insert({ class_id: classId, student_id: newProfile.data.id, student_number: row.studentNumber })
          .select('class_id,student_id,student_number,joined_at')
          .single()

        if (inserted.error) throw inserted.error
        createdMemberships.push(inserted.data)
      }

      return {
        created: createdProfiles.length,
        memberships: createdMemberships,
        authUserIds: authCreatePlan,
      }
    },
  }
}
