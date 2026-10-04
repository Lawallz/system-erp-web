import { createContext, useContext } from "react";
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
};
export type Credentials = { email: string; password: string };
type AuthData = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionError: string;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
  retry: () => void;
};
export const AuthContext = createContext<AuthData | undefined>(undefined);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider");
  return context;
}
