import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { ErrorState, Loading } from "../components/ui";
export function ProtectedRoute() {
  const { isAuthenticated, loading, sessionError, retry, logout } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loading) return <Loading />;
  if (sessionError)
    return (
      <main className="session-error">
        <ErrorState message={sessionError} retry={retry} />
        <button className="btn secondary" onClick={logout}>
          Voltar ao login
        </button>
      </main>
    );
  return <Outlet />;
}
