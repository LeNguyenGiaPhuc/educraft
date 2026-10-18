export const ACCESS_COOKIE = 'educraft_access_token'
export const REFRESH_COOKIE = 'educraft_refresh_token'
export const GOOGLE_OAUTH_COOKIE = 'educraft_google_oauth'

const GOOGLE_OAUTH_CALLBACK_PATH = '/api/auth/google/callback'
const GOOGLE_OAUTH_MAX_AGE_MS = 5 * 60 * 1000

function cookieOptions(nodeEnv) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
  }
}

export function setAuthCookies(response, session, nodeEnv) {
  const options = cookieOptions(nodeEnv)
  response.cookie(ACCESS_COOKIE, session.access_token, {
    ...options,
    maxAge: session.expires_in * 1000,
  })
  response.cookie(REFRESH_COOKIE, session.refresh_token, {
    ...options,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookies(response, nodeEnv) {
  const options = cookieOptions(nodeEnv)
  response.clearCookie(ACCESS_COOKIE, options)
  response.clearCookie(REFRESH_COOKIE, options)
}

export function setGoogleOAuthCookie(response, state, nodeEnv) {
  response.cookie(GOOGLE_OAUTH_COOKIE, state, {
    ...cookieOptions(nodeEnv),
    path: GOOGLE_OAUTH_CALLBACK_PATH,
    maxAge: GOOGLE_OAUTH_MAX_AGE_MS,
  })
}

export function clearGoogleOAuthCookie(response, nodeEnv) {
  response.clearCookie(GOOGLE_OAUTH_COOKIE, {
    ...cookieOptions(nodeEnv),
    path: GOOGLE_OAUTH_CALLBACK_PATH,
  })
}
