import { useEffect, useMemo, useState } from 'react'

import AuthContext from './AuthContext.js'
import { authService } from '../services/authService.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    authService
      .restoreSession()
      .then((nextUser) => {
        if (isMounted) {
          setUser(nextUser)
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function login(email, password) {
    try {
      const nextUser = await authService.login(email, password)
      setUser(nextUser)
      return { status: 'success', data: nextUser }
    } catch (error) {
      return {
        status: 'error',
        message: error.message ?? 'Đăng nhập không thành công.',
      }
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  async function refreshUser() {
    const nextUser = await authService.restoreSession()
    setUser(nextUser)
    return nextUser
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
