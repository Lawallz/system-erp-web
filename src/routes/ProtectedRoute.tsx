import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Feedback } from '../components/UI'
export function ProtectedRoute() {
  const { isAuthenticated, loading, error, refresh, logout } = useAuth()
  if (loading || error)
    return (
      <div className="main-content">
        <Feedback loading={loading} error={error} retry={refresh} />
        {error && (
          <button className="btn" onClick={logout}>
            Voltar ao login
          </button>
        )}
      </div>
    )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
