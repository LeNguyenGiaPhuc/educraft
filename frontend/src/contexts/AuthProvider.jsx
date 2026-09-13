import { useMemo, useState } from 'react'

import AuthContext from './AuthContext.js'
import {
  getCurrentUser,
  loginWithMockCredentials,
  logoutMockUser,
} from '../data/mockAuthStore.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser())

  function login(email, password) {
    const result = loginWithMockCredentials(email, password)

    if (result.status === 'success') {
      setUser(result.data)
    }

    return result
  }

  function logout() {
    logoutMockUser()
    setUser(null)
  }

  function refreshUser() {
    setUser(getCurrentUser())
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
