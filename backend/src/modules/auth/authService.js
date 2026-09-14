import { AppError } from '../../common/errors.js'

export function createAuthService({ authClient, adminClient, createUserClient }) {
  async function readActiveProfile(accessToken, userId) {
    const supabase = createUserClient(accessToken)
    const result = await supabase
      .from('profiles')
      .select('id,email,username,full_name,role,status,student_code')
      .eq('id', userId)
      .single()

    if (result.error?.code === 'PGRST116') {
      throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
    }
    if (result.error) throw result.error
    if (!result.data) {
      throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
    }
    if (result.data.status !== 'ACTIVE') {
      throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản chưa hoạt động.')
    }

    return result.data
  }

  async function revoke(accessToken) {
    if (accessToken) {
      await adminClient.auth.admin.signOut(accessToken, 'local')
    }
  }

  async function acceptSession(result, failureCode, failureMessage) {
    if (result.error || !result.data.session || !result.data.user) {
      throw new AppError(401, failureCode, failureMessage)
    }

    try {
      const profile = await readActiveProfile(
        result.data.session.access_token,
        result.data.user.id,
      )
      return { session: result.data.session, profile }
    } catch (error) {
      await revoke(result.data.session.access_token)
      throw error
    }
  }

  return {
    async login(credentials) {
      const result = await authClient.auth.signInWithPassword(credentials)
      return acceptSession(
        result,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng.',
      )
    },

    async refresh(refreshToken) {
      if (!refreshToken) {
        throw new AppError(401, 'REFRESH_REQUIRED', 'Phiên đăng nhập đã hết hạn.')
      }
      const result = await authClient.auth.refreshSession({
        refresh_token: refreshToken,
      })
      return acceptSession(
        result,
        'INVALID_SESSION',
        'Phiên đăng nhập không hợp lệ.',
      )
    },

    async logout(accessToken) {
      await revoke(accessToken)
    },
  }
}
