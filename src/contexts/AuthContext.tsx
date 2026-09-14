import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

import { api } from '../api/http'

type User = {
  id: string
  name: string
  email: string
  role: string
}

type LoginCredentials = {
  email: string
  password: string
}

type LoginResponse = {
  token: string
  user: User
}

type AuthContextData = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextData | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('erp_token'),
  )

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('erp_user')

    if (!savedUser) {
      return null
    }

    try {
      return JSON.parse(savedUser) as User
    } catch {
      localStorage.removeItem('erp_user')
      return null
    }
  })

  async function login(credentials: LoginCredentials) {
    const response = await api.post<LoginResponse>(
      '/auth/login',
      credentials,
    )

    const { token: newToken, user: loggedUser } = response.data

    localStorage.setItem('erp_token', newToken)
    localStorage.setItem('erp_user', JSON.stringify(loggedUser))

    setToken(newToken)
    setUser(loggedUser)
  }

  function logout() {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')

    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider')
  }

  return context
}