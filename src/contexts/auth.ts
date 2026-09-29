import { createContext } from 'react'
export type User = {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}
export type Credentials = { email: string; password: string }
export type AuthState = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string
  can: (permission: string) => boolean
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
  refresh: () => void
}
export const AuthContext = createContext<AuthState | undefined>(undefined)
