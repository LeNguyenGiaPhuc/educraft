import { randomBytes } from 'node:crypto'

import { AppError } from '../../common/errors.js'

const ACCOUNT_COLUMNS = [
  'id',
  'email',
  'username',
  'full_name',
  'role',
  'status',
  'student_code',
  'created_at',
  'updated_at',
].join(',')

const HISTORY_MESSAGE = 'Tài khoản đã có lịch sử học tập nên không thể xóa.'

export function createAccountService({ adminClient } = {}) {
  async function requireAdmin(auth) {
    if (!auth?.profile || auth.profile.role !== 'ADMIN' || auth.profile.status !== 'ACTIVE') {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
    }
  }

  function getWriteClient(auth) {
    return adminClient ?? auth.supabase
  }

  async function ensureAccountExists(supabase, accountId) {
    const result = await supabase
      .from('profiles')
      .select(ACCOUNT_COLUMNS)
      .eq('id', accountId)
      .maybeSingle()

    if (result.error) throw result.error
    if (!result.data) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.')
    }

    return result.data
  }

  async function setStatusById(supabase, accountId, status) {
    const result = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', accountId)
      .select(ACCOUNT_COLUMNS)
      .single()

    if (result.error?.code === 'PGRST116') {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.')
    }
    if (result.error) throw result.error
    return result.data
  }

  async function normalizeEmail(email) {
    return String(email ?? '').trim().toLowerCase()
  }

  async function conflictIfEmailExists(supabase, email, excludeId = null) {
    const result = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1)

    if (result.error) throw result.error
    if (result.data?.some((row) => row.id !== excludeId)) {
      throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
    }
  }

  async function createAuthUser(payload) {
    if (!adminClient?.auth?.admin?.createUser) {
      throw new AppError(500, 'AUTH_ADMIN_NOT_CONFIGURED', 'Dịch vụ tài khoản chưa sẵn sàng.')
    }

    let result
    try {
      result = await adminClient.auth.admin.createUser(payload)
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

  async function deleteAuthUser(accountId) {
    if (!adminClient?.auth?.admin?.deleteUser) {
      throw new AppError(500, 'AUTH_DELETE_FAILED', 'Không thể xóa tài khoản đăng nhập.')
    }

    let result
    try {
      result = await adminClient.auth.admin.deleteUser(accountId)
    } catch {
      throw new AppError(500, 'AUTH_DELETE_FAILED', 'Không thể xóa tài khoản đăng nhập.')
    }

    if (result?.error) {
      const errorText = `${result.error.code ?? ''} ${result.error.message ?? ''}`.toLowerCase()
      if (errorText.includes('foreign key') || errorText.includes('restrict') || errorText.includes('history')) {
        throw new AppError(409, 'ACCOUNT_HAS_HISTORY', HISTORY_MESSAGE)
      }
      throw new AppError(500, 'AUTH_DELETE_FAILED', 'Không thể xóa tài khoản đăng nhập.')
    }
  }

  async function updateAuthEmail(accountId, email) {
    if (!adminClient?.auth?.admin?.updateUserById) {
      throw new AppError(500, 'AUTH_ADMIN_NOT_CONFIGURED', 'Dịch vụ tài khoản chưa sẵn sàng.')
    }

    let result
    try {
      result = await adminClient.auth.admin.updateUserById(accountId, {
        email,
        email_confirm: true,
      })
    } catch {
      throw new AppError(500, 'AUTH_UPDATE_FAILED', 'Không thể cập nhật tài khoản đăng nhập.')
    }

    if (result?.error) {
      if (result.error.code === 'email_exists' || result.error.status === 422) {
        throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
      }
      throw new AppError(500, 'AUTH_UPDATE_FAILED', 'Không thể cập nhật tài khoản đăng nhập.')
    }
  }

  async function updateAuthPassword(accountId, password) {
    if (!adminClient?.auth?.admin?.updateUserById) {
      throw new AppError(500, 'AUTH_ADMIN_NOT_CONFIGURED', 'Dịch vụ tài khoản chưa sẵn sàng.')
    }

    let result
    try {
      result = await adminClient.auth.admin.updateUserById(accountId, { password })
    } catch {
      throw new AppError(500, 'AUTH_UPDATE_FAILED', 'Không thể cập nhật mật khẩu đăng nhập.')
    }

    if (result?.error) {
      throw new AppError(500, 'AUTH_UPDATE_FAILED', 'Không thể cập nhật mật khẩu đăng nhập.')
    }
  }

  async function ensureRoleChangeAllowed(supabase, accountId, nextRole, currentRole) {
    if (!nextRole || nextRole === currentRole) {
      return
    }

    const [teacherClasses, memberships, submissions, reviews] = await Promise.all([
      supabase.from('classes').select('id').eq('teacher_id', accountId).limit(1),
      supabase.from('class_members').select('class_id').eq('student_id', accountId).limit(1),
      supabase.from('submissions').select('id').eq('student_id', accountId).limit(1),
      supabase.from('teacher_reviews').select('id').eq('teacher_id', accountId).limit(1),
    ])

    if (teacherClasses.error) throw teacherClasses.error
    if (memberships.error) throw memberships.error
    if (submissions.error) throw submissions.error
    if (reviews.error) throw reviews.error
    if (teacherClasses.data?.length || memberships.data?.length || submissions.data?.length || reviews.data?.length) {
      throw new AppError(
        409,
        'ACCOUNT_ROLE_CONFLICT',
        'Không thể đổi vai trò khi tài khoản còn liên kết với lớp hoặc lịch sử học tập.',
      )
    }
  }

  function ensureNotCurrentAdmin(auth, accountId, code, message) {
    if (auth.profile.id === accountId) {
      throw new AppError(409, code, message)
    }
  }

  function mapProfileError(error) {
    if (error?.code === '23505' || error?.message?.includes('profiles_email_unique')) {
      return new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
    }
    return error
  }

  async function listAllowed(rows) {
    return rows ?? []
  }

  async function attachClasses(supabase, accounts) {
    if (accounts.length === 0) return []

    const accountIds = accounts.map((account) => account.id)
    const [teacherResult, studentResult] = await Promise.all([
      supabase
        .from('classes')
        .select('id,code,teacher_id')
        .in('teacher_id', accountIds),
      supabase
        .from('class_members')
        .select('student_id,classroom:classes!class_members_class_id_fkey(id,code)')
        .in('student_id', accountIds),
    ])

    if (teacherResult.error) throw teacherResult.error
    if (studentResult.error) throw studentResult.error

    const classesByAccount = new Map(accountIds.map((id) => [id, []]))

    for (const classroom of teacherResult.data ?? []) {
      classesByAccount.get(classroom.teacher_id)?.push({
        id: classroom.id,
        code: classroom.code,
      })
    }

    for (const membership of studentResult.data ?? []) {
      const classroom = Array.isArray(membership.classroom)
        ? membership.classroom[0]
        : membership.classroom

      if (classroom) {
        classesByAccount.get(membership.student_id)?.push(classroom)
      }
    }

    return accounts.map((account) => ({
      ...account,
      classes: (classesByAccount.get(account.id) ?? [])
        .sort((left, right) => left.code.localeCompare(right.code, 'vi')),
    }))
  }

  return {
    async listAccounts(auth, query = {}) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      let request = supabase
        .from('profiles')
        .select(ACCOUNT_COLUMNS)

      if (query.search) {
        request = request.or(`username.ilike.%${query.search}%, full_name.ilike.%${query.search}%, email.ilike.%${query.search}%`)
      }
      if (query.role) {
        request = request.eq('role', query.role)
      }
      if (query.status) {
        request = request.eq('status', query.status)
      }

      const result = await request.order('created_at', { ascending: false })
      if (result.error) throw result.error
      const accounts = await listAllowed(result.data)
      return attachClasses(supabase, accounts)
    },

    async getAccount(auth, accountId) {
      await requireAdmin(auth)
      return ensureAccountExists(auth.supabase, accountId)
    },

    async createAccount(auth, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      const writeClient = getWriteClient(auth)
      const normalizedEmail = await normalizeEmail(input.email)
      const normalizedPassword = input.password?.trim()
      const payload = {
        username: input.username.trim(),
        full_name: input.full_name.trim(),
        email: normalizedEmail,
        role: input.role,
        status: input.status ?? 'PENDING',
        student_code: input.student_code ? input.student_code.trim() : null,
      }

      await conflictIfEmailExists(supabase, normalizedEmail)
      const authUser = await createAuthUser({
        email: normalizedEmail,
        password: normalizedPassword || randomBytes(18).toString('base64url'),
        email_confirm: true,
        user_metadata: { full_name: payload.full_name },
      })

      try {
        const result = await writeClient
          .from('profiles')
          .insert({ ...payload, id: authUser.id })
          .select(ACCOUNT_COLUMNS)
          .single()

        if (result.error) throw mapProfileError(result.error)
        return result.data
      } catch (error) {
        try {
          await deleteAuthUser(authUser.id)
        } catch {
          throw new AppError(500, 'ACCOUNT_ROLLBACK_FAILED', 'Không thể hoàn tác tài khoản vừa tạo.')
        }
        throw error
      }
    },

    async updateAccount(auth, accountId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      const writeClient = getWriteClient(auth)
      const profile = await ensureAccountExists(supabase, accountId)
      const normalizedEmail = input.email ? await normalizeEmail(input.email) : null
      const normalizedPassword = input.password?.trim()
      const updatePayload = {}

      for (const key of Object.keys(input)) {
        if (key === 'email') {
          updatePayload.email = normalizedEmail
        } else if (key === 'username') {
          updatePayload.username = input.username.trim()
        } else if (key === 'full_name') {
          updatePayload.full_name = input.full_name.trim()
        } else if (key === 'student_code') {
          updatePayload.student_code = input.student_code ? input.student_code.trim() : null
        } else if (key === 'password') {
          continue
        } else {
          updatePayload[key] = input[key]
        }
      }

      if (normalizedEmail && normalizedEmail !== profile.email) {
        await conflictIfEmailExists(supabase, normalizedEmail, accountId)
      }
      await ensureRoleChangeAllowed(writeClient, accountId, input.role, profile.role)

      const emailChanged = Boolean(normalizedEmail && normalizedEmail !== profile.email)
      const passwordChanged = Boolean(normalizedPassword)
      if (emailChanged) {
        await updateAuthEmail(accountId, normalizedEmail)
      }

      try {
        let result = { data: profile, error: null }

        if (Object.keys(updatePayload).length > 0) {
          result = await writeClient
            .from('profiles')
            .update(updatePayload)
            .eq('id', accountId)
            .select(ACCOUNT_COLUMNS)
            .single()

          if (result.error) throw mapProfileError(result.error)
        }

        if (passwordChanged) {
          await updateAuthPassword(accountId, normalizedPassword)
        }

        return result.data
      } catch (error) {
        if (emailChanged) {
          try {
            await updateAuthEmail(accountId, profile.email)
          } catch {
            throw new AppError(500, 'ACCOUNT_ROLLBACK_FAILED', 'Không thể đồng bộ lại email đăng nhập.')
          }
        }
        throw error
      }
    },

    async lockAccount(auth, accountId) {
      await requireAdmin(auth)
      ensureNotCurrentAdmin(auth, accountId, 'CANNOT_LOCK_SELF', 'Không thể khóa tài khoản đang đăng nhập.')
      return setStatusById(getWriteClient(auth), accountId, 'LOCKED')
    },

    async unlockAccount(auth, accountId) {
      await requireAdmin(auth)
      return setStatusById(getWriteClient(auth), accountId, 'ACTIVE')
    },

    async deleteAccount(auth, accountId) {
      await requireAdmin(auth)
      ensureNotCurrentAdmin(auth, accountId, 'CANNOT_DELETE_SELF', 'Không thể xóa tài khoản đang đăng nhập.')
      const supabase = auth.supabase
      await ensureAccountExists(supabase, accountId)

      const historyClient = getWriteClient(auth)
      const [submissions, reviews] = await Promise.all([
        historyClient.from('submissions').select('id', { count: 'exact', head: true }).eq('student_id', accountId),
        historyClient.from('teacher_reviews').select('id', { count: 'exact', head: true }).eq('teacher_id', accountId),
      ])

      if (submissions.error) throw submissions.error
      if (reviews.error) throw reviews.error
      if ((submissions.count ?? 0) > 0 || (reviews.count ?? 0) > 0) {
        throw new AppError(409, 'ACCOUNT_HAS_HISTORY', HISTORY_MESSAGE)
      }

      if (adminClient?.auth?.admin?.deleteUser) {
        await deleteAuthUser(accountId)
        return null
      }

      const deleteProfile = await getWriteClient(auth)
        .from('profiles')
        .delete()
        .eq('id', accountId)

      if (deleteProfile.error) throw deleteProfile.error
      return null
    },
  }
}
