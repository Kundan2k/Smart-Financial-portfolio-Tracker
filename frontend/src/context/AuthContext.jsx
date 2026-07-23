import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)  // true while checking stored token

  // On mount: verify stored token and load user
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }

    authApi.me()
      .then(res => setUser(res.data))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  const _persist = (data) => {
    localStorage.setItem('access_token',  data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user)
  }

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password)
    _persist(data)
    return data.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const { data } = await authApi.register(name, email, password)
    _persist(data)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}