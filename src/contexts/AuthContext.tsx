import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api/http";
import { errorMessage } from "../lib/format";

import { AuthContext, type User, type Credentials } from "./auth-context";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("erp_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [sessionError, setSessionError] = useState("");
  const [revision, setRevision] = useState(0);
  function logout() {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    setToken(null);
    setUser(null);
    setLoading(false);
    setSessionError("");
  }
  useEffect(() => {
    window.addEventListener("erp:unauthorized", logout);
    return () => window.removeEventListener("erp:unauthorized", logout);
  }, []);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await api.get<User>("/auth/me", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setUser(response.data);
          setSessionError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setUser(null);
          setSessionError(errorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [token, revision]);
  async function login(credentials: Credentials) {
    const response = await api.post<{ token: string; user: User }>(
      "/auth/login",
      credentials,
    );
    localStorage.setItem("erp_token", response.data.token);
    localStorage.removeItem("erp_user");
    setSessionError("");
    setUser(response.data.user);
    setToken(response.data.token);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(token),
        loading,
        sessionError,
        login,
        logout,
        can: (permission) => user?.permissions?.includes(permission) ?? false,
        retry: () => {
          setLoading(true);
          setRevision((value) => value + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
