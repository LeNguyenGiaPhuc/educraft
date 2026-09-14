export const ACCESS_COOKIE = 'educraft_access_token'
export const REFRESH_COOKIE = 'educraft_refresh_token'

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
