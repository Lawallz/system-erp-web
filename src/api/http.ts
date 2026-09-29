import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      window.dispatchEvent(new Event('erp:session-expired'))
    }
    if (
      error.response?.status === 403 &&
      !error.config?.url?.includes('/auth/me')
    ) {
      window.dispatchEvent(new Event('erp:permissions-changed'))
    }
    return Promise.reject(error)
  },
)
