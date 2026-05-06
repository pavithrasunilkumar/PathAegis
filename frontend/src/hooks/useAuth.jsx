import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('pathaegis_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials)
    localStorage.setItem('pathaegis_token', data.token)
    localStorage.setItem('pathaegis_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const register = async (credentials) => {
    await authAPI.register(credentials)
  }

  const logout = async () => {
    try { await authAPI.logout() } catch (_) {}
    localStorage.removeItem('pathaegis_token')
    localStorage.removeItem('pathaegis_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
