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

export function createAccountService({ adminClient } = {}) {
  async function requireAdmin(auth) {
    if (!auth?.profile || auth.profile.role !== 'ADMIN' || auth.profile.status !== 'ACTIVE') {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
    }
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

  async function listAllowed(rows) {
    return rows ?? []
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
      return listAllowed(result.data)
    },

    async getAccount(auth, accountId) {
      await requireAdmin(auth)
      return ensureAccountExists(auth.supabase, accountId)
    },

    async createAccount(auth, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      const normalizedEmail = await normalizeEmail(input.email)
      const payload = {
        username: input.username.trim(),
        full_name: input.full_name.trim(),
        email: normalizedEmail,
        role: input.role,
        status: input.status ?? 'PENDING',
        student_code: input.student_code ? input.student_code.trim() : null,
      }

      await conflictIfEmailExists(supabase, normalizedEmail)

      const result = await supabase
        .from('profiles')
        .insert(payload)
        .select(ACCOUNT_COLUMNS)
        .single()

      if (result.error) {
        if (result.error.code === '23505' || result.error.message?.includes('profiles_email_unique')) {
          throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
        }
        throw result.error
      }

      return result.data
    },

    async updateAccount(auth, accountId, input) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      const profile = await ensureAccountExists(supabase, accountId)
      const normalizedEmail = input.email ? await normalizeEmail(input.email) : null
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
        } else {
          updatePayload[key] = input[key]
        }
      }

      if (normalizedEmail && normalizedEmail !== profile.email) {
        await conflictIfEmailExists(supabase, normalizedEmail, accountId)
      }

      const result = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', accountId)
        .select(ACCOUNT_COLUMNS)
        .single()

      if (result.error) {
        if (result.error.code === '23505' || result.error.message?.includes('profiles_email_unique')) {
          throw new AppError(409, 'ACCOUNT_EMAIL_CONFLICT', 'Email đã được sử dụng.')
        }
        throw result.error
      }

      return result.data
    },

    async lockAccount(auth, accountId) {
      await requireAdmin(auth)
      return setStatusById(auth.supabase, accountId, 'LOCKED')
    },

    async unlockAccount(auth, accountId) {
      await requireAdmin(auth)
      return setStatusById(auth.supabase, accountId, 'ACTIVE')
    },

    async deleteAccount(auth, accountId) {
      await requireAdmin(auth)
      const supabase = auth.supabase
      await ensureAccountExists(supabase, accountId)

      const submissions = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', accountId)

      if (submissions.error) throw submissions.error
      if ((submissions.count ?? 0) > 0) {
        throw new AppError(409, 'ACCOUNT_HAS_HISTORY', 'Tài khoản đã có lịch sử học tập nên không thể xóa.')
      }

      const deleteProfile = await supabase
        .from('profiles')
        .delete()
        .eq('id', accountId)

      if (deleteProfile.error) throw deleteProfile.error

      if (adminClient?.auth?.admin?.deleteUser) {
        await adminClient.auth.admin.deleteUser(accountId)
      }

      return null
    },
  }
}
