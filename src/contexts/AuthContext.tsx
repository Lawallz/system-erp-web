import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/http'
import { errorMessage, unwrap } from '../api/data'
import { AuthContext, type Credentials, type User } from './auth'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('erp_token'),
  )
  // Cached permissions are never trusted to authorize the initial UI.
  const [user, setUser] = useState<User | null>(null)
  const [resolvedToken, setResolvedToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  function logout() {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setToken(null)
    setUser(null)
    setError('')
    setResolvedToken(null)
  }
  useEffect(() => {
    const expired = () => {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      setToken(null)
      setUser(null)
      setError('')
      setResolvedToken(null)
    }
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('erp:session-expired', expired)
    window.addEventListener('focus', refresh)
    window.addEventListener('erp:permissions-changed', refresh)
    return () => {
      window.removeEventListener('erp:session-expired', expired)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('erp:permissions-changed', refresh)
    }
  }, [])
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api
      .get('/auth/me', { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return
        const fresh = unwrap<User>(response.data)
        setUser(fresh)
        setError('')
        setResolvedToken(token)
        localStorage.setItem('erp_user', JSON.stringify(fresh))
      })
      .catch((error) => {
        if (controller.signal.aborted || error.response?.status === 401) return
        setUser(null)
        setResolvedToken(token)
        setError(errorMessage(error))
      })
    return () => controller.abort()
  }, [token, revision])
  async function login(credentials: Credentials) {
    const response = await api.post<{ token: string; user: User }>(
      '/auth/login',
      credentials,
    )
    localStorage.setItem('erp_token', response.data.token)
    setToken(response.data.token)
    setError('')
    setResolvedToken(null)
    setUser(null)
    setRevision((value) => value + 1)
  }
  const loading = Boolean(token && resolvedToken !== token)
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated: Boolean(token && user),
        can: (permission) =>
          !loading && Boolean(user?.permissions?.includes(permission)),
        login,
        logout,
        refresh: () => {
          setResolvedToken(null)
          setRevision((value) => value + 1)
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
