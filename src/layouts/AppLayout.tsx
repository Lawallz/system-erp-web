import { useState } from 'react'
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  PackageOpen,
  ShoppingCart,
  Tags,
  Truck,
  UserCog,
  Users,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
const groups = [
  {
    label: 'VISÃO GERAL',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    label: 'OPERAÇÃO',
    items: [
      { label: 'Produtos', to: '/products', icon: Package },
      { label: 'Categorias', to: '/categories', icon: Tags },
      { label: 'Estoque', to: '/stock', icon: PackageOpen },
      { label: 'Vendas', to: '/sales', icon: ShoppingCart },
      { label: 'Compras', to: '/purchases', icon: ClipboardList },
      { label: 'Fornecedores', to: '/suppliers', icon: Truck },
    ],
  },
  {
    label: 'ADMINISTRAÇÃO',
    items: [
      { label: 'Relatórios', to: '/reports', icon: ChartNoAxesCombined },
      { label: 'Usuários', to: '/users', icon: Users },
      { label: 'Funções e permissões', to: '/roles', icon: UserCog },
    ],
  },
]
export function AppLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const title =
    groups.flatMap((group) => group.items).find((item) => item.to === pathname)
      ?.label || 'Workspace'
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Boxes size={23} />
          </span>
          <div>
            MiniERP<small>Gestão que conecta.</small>
          </div>
          <button
            className="icon-btn mobile-only"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div id="navigation" className={`navigation ${open ? 'is-open' : ''}`}>
          <nav aria-label="Navegação principal">
            {groups.map((group) => (
              <div className="nav-group" key={group.label}>
                <p>{group.label}</p>
                {group.items.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      isActive ? 'nav-item active' : 'nav-item'
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-note">
              <span className="status-dot" /> Seu espaço de gestão
              <small>Uma visão completa da operação.</small>
            </div>
            <button className="nav-item logout" onClick={logout}>
              <LogOut size={18} />
              Sair da conta
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="profile">
            <span className="avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
          </div>
        </header>
        <main id="main" className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          MiniERP <span>Clareza para decidir. Controle para crescer.</span>
        </footer>
      </div>
    </div>
  )
}
