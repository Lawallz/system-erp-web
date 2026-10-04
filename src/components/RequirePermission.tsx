import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { EmptyState } from "./ui";
export function RequirePermission({
  permissions,
  children,
}: {
  permissions: string[];
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!permissions.every(can))
    return (
      <EmptyState title="Acesso restrito">
        <p>Seu perfil não tem permissão para acessar esta área.</p>
        <Link className="btn secondary" to="/">
          Voltar ao início
        </Link>
      </EmptyState>
    );
  return children;
}
