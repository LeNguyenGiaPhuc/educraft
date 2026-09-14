import { AppError } from '../common/errors.js'
import { ACCESS_COOKIE } from '../modules/auth/authCookies.js'

export function createAuthenticate({ authClient, createUserClient }) {
  return async function authenticate(request, _response, next) {
    try {
      const accessToken = request.cookies[ACCESS_COOKIE]
      if (!accessToken) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.')
      }

      const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
      if (userError || !userData.user) {
        throw new AppError(401, 'INVALID_SESSION', 'Phiên đăng nhập không hợp lệ.')
      }

      const supabase = createUserClient(accessToken)
      const profileResult = await supabase
        .from('profiles')
        .select('id,email,username,full_name,role,status,student_code')
        .eq('id', userData.user.id)
        .single()

      if (profileResult.error?.code === 'PGRST116') {
        throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
      }
      if (profileResult.error) {
        throw profileResult.error
      }
      if (!profileResult.data) {
        throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản không ở trạng thái hoạt động.')
      }
      if (profileResult.data.status !== 'ACTIVE') {
        throw new AppError(403, 'ACCOUNT_NOT_ACTIVE', 'Tài khoản chưa hoạt động.')
      }

      request.auth = {
        user: userData.user,
        profile: profileResult.data,
        accessToken,
        supabase,
      }
      return next()
    } catch (error) {
      return next(error)
    }
  }
}
