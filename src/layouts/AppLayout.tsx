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
} from 'lucide-react'

import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

const navigation = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Produtos',
    to: '/products',
    icon: Package,
  },
  {
    label: 'Categorias',
    to: '/categories',
    icon: Tags,
  },
  {
    label: 'Estoque',
    to: '/stock',
    icon: PackageOpen,
  },
  {
    label: 'Vendas',
    to: '/sales',
    icon: ShoppingCart,
  },
  {
    label: 'Compras',
    to: '/purchases',
    icon: ClipboardList,
  },
  {
    label: 'Fornecedores',
    to: '/suppliers',
    icon: Truck,
  },
  {
    label: 'Relatórios',
    to: '/reports',
    icon: ChartNoAxesCombined,
  },
  {
    label: 'Usuários',
    to: '/users',
    icon: Users,
  },
  {
    label: 'Funções',
    to: '/roles',
    icon: UserCog,
  },
]

export function AppLayout() {
  const {
    user,
    logout,
  } = useAuth()

  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Boxes size={22} />
          </div>

          <div>
            <p className="font-bold text-white">
              MiniERP
            </p>

            <p className="text-xs text-slate-500">
              Gestão empresarial
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon size={19} />

                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <LogOut size={19} />

            Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-8">
          <div>
            <p className="text-sm text-slate-400">
              MiniERP
            </p>

            <p className="font-semibold text-slate-800">
              Painel administrativo
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name}
              </p>

              <p className="text-xs text-slate-400">
                {user?.role}
              </p>
            </div>
          </div>
        </header>

        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}