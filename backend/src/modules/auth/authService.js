import { AppError } from '../../common/errors.js'
import { createGoogleOAuthStorage } from './googleOAuthState.js'

export function createAuthService({
  authClient,
  adminClient,
  createOAuthClient,
  createUserClient,
  googleOAuthCallbackUrl,
}) {
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

  function googleOAuthFailure() {
    return new AppError(401, 'GOOGLE_OAUTH_FAILED', 'Đăng nhập Google không thành công.')
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

    async startGoogleLogin() {
      try {
        const storage = createGoogleOAuthStorage()
        const client = createOAuthClient(storage)
        const result = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: googleOAuthCallbackUrl,
            skipBrowserRedirect: true,
          },
        })

        if (result.error || !result.data?.url) {
          throw new Error('Google OAuth authorization URL was not returned')
        }

        return { url: result.data.url, state: storage.serialize() }
      } catch {
        throw new AppError(
          503,
          'GOOGLE_OAUTH_UNAVAILABLE',
          'Không thể bắt đầu đăng nhập Google.',
        )
      }
    },

    async completeGoogleLogin(code, serializedState) {
      if (typeof code !== 'string' || code.trim() === '') {
        throw googleOAuthFailure()
      }

      let client
      try {
        const storage = createGoogleOAuthStorage(serializedState)
        client = createOAuthClient(storage)
      } catch {
        throw googleOAuthFailure()
      }

      let result
      try {
        result = await client.auth.exchangeCodeForSession(code)
      } catch {
        throw googleOAuthFailure()
      }

      return acceptSession(
        result,
        'GOOGLE_OAUTH_FAILED',
        'Đăng nhập Google không thành công.',
      )
    },
  }
}
