import { sendData } from '../../common/response.js'
import {
  ACCESS_COOKIE,
  GOOGLE_OAUTH_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  clearGoogleOAuthCookie,
  setAuthCookies,
  setGoogleOAuthCookie,
} from './authCookies.js'

export function createAuthController({ authService, frontendOrigin, nodeEnv }) {
  function noStore(response) {
    response.set('Cache-Control', 'private, no-store')
  }

  function loginRedirect(outcome) {
    const url = new URL('/login', frontendOrigin)
    url.searchParams.set('oauth', outcome)
    return url.toString()
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

    async googleStart(_request, response) {
      noStore(response)
      const result = await authService.startGoogleLogin()
      setGoogleOAuthCookie(response, result.state, nodeEnv)
      return response.redirect(302, result.url)
    },

    async googleCallback(request, response) {
      noStore(response)
      const state = request.cookies[GOOGLE_OAUTH_COOKIE]
      clearGoogleOAuthCookie(response, nodeEnv)

      if (request.query.error || !request.query.code || !state) {
        return response.redirect(303, loginRedirect('failed'))
      }

      try {
        const result = await authService.completeGoogleLogin(request.query.code, state)
        setAuthCookies(response, result.session, nodeEnv)
        return response.redirect(303, loginRedirect('success'))
      } catch {
        clearAuthCookies(response, nodeEnv)
        return response.redirect(303, loginRedirect('failed'))
      }
    },
  }
}
