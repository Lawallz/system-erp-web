import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { ErrorState, Loading } from "../components/ui";
export function ProtectedRoute() {
  const { isAuthenticated, loading, sessionError, retry, logout } = useAuth();
  const { pathname, search, hash } = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ returnTo: pathname + search + hash }} />;
  }
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
