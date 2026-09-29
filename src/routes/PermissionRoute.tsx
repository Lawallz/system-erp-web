import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
const starts = [
  ['reports:read', '/'],
  ['sales:create', '/sales/new'],
  ['products:read', '/products'],
  ['sales:read', '/sales'],
  ['stock:read', '/stock'],
  ['purchases:read', '/purchases'],
  ['suppliers:read', '/suppliers'],
  ['users:read', '/users'],
]
export function PermissionRoute({ permission }: { permission: string }) {
  const can = usePermissions()
  return can(permission) ? <Outlet /> : <Navigate to="/access" replace />
}
export function AccessPage() {
  const can = usePermissions()
  const first = starts.find(([permission]) => can(permission))
  if (first) return <Navigate to={first[1]} replace />
  return (
    <div className="panel empty">
      <h1>Acesso aguardando liberação</h1>
      <p>Peça ao administrador para atribuir as permissões da sua função.</p>
    </div>
  )
}
