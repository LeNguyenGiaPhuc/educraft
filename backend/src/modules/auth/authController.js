import { sendData } from '../../common/response.js'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './authCookies.js'

export function createAuthController({ authService, nodeEnv }) {
  function noStore(response) {
    response.set('Cache-Control', 'private, no-store')
  }

  return {
    async login(request, response) {
      noStore(response)
      const result = await authService.login(request.validated.body)
      setAuthCookies(response, result.session, nodeEnv)
      return sendData(response, result.profile)
    },

    async refresh(request, response) {
      noStore(response)
      const result = await authService.refresh(request.cookies[REFRESH_COOKIE])
      setAuthCookies(response, result.session, nodeEnv)
      return sendData(response, result.profile)
    },

    async logout(request, response) {
      noStore(response)
      await authService.logout(request.cookies[ACCESS_COOKIE])
      clearAuthCookies(response, nodeEnv)
      return response.status(204).end()
    },

    me(request, response) {
      noStore(response)
      return sendData(response, request.auth.profile)
    },
  }
}
