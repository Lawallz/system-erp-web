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
  ArrowUpRight,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/auth-context";
const navigation = [
  { label: "Visão geral", to: "/", icon: LayoutDashboard, permissions: [] },
  {
    label: "Produtos",
    to: "/products",
    icon: Package,
    permissions: ["products:read"],
  },
  {
    label: "Venda rápida",
    to: "/sales",
    icon: ShoppingCart,
    permissions: ["sales:create", "products:read"],
  },
  {
    label: "Categorias",
    to: "/categories",
    icon: Tags,
    permissions: ["products:read"],
    soon: true,
  },
  {
    label: "Estoque",
    to: "/stock",
    icon: PackageOpen,
    permissions: ["stock:read"],
    soon: true,
  },
  {
    label: "Compras",
    to: "/purchases",
    icon: ClipboardList,
    permissions: ["purchases:read"],
    soon: true,
  },
  {
    label: "Fornecedores",
    to: "/suppliers",
    icon: Truck,
    permissions: ["suppliers:read"],
    soon: true,
  },
  {
    label: "Relatórios",
    to: "/reports",
    icon: ChartNoAxesCombined,
    permissions: ["reports:read"],
    soon: true,
  },
  {
    label: "Usuários",
    to: "/users",
    icon: Users,
    permissions: ["users:read"],
    soon: true,
  },
  {
    label: "Funções",
    to: "/roles",
    icon: UserCog,
    permissions: ["users:read"],
    soon: true,
  },
];
export function AppLayout() {
  const { user, logout, can } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const active = navigation.find((item) => item.to === location.pathname);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className={`sidebar ${open ? "is-open" : ""}`} id="navigation">
        <div className="brand">
          <span>
            <Boxes size={25} />
          </span>
          <div>
            mini<span className="brand-weight">erp</span>
            <small>GESTÃO QUE FLUI</small>
          </div>
          <button
            className="mobile-close icon-btn"
            aria-label="Fechar menu"
            onClick={() => {
              setOpen(false);
              toggle.current?.focus();
            }}
          >
            <X />
          </button>
        </div>
        <p className="nav-caption">ESPAÇO DE TRABALHO</p>
        <nav aria-label="Navegação principal">
          {navigation
            .filter((item) => item.permissions.every(can))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.soon && <small>Em breve</small>}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> Seu negócio, organizado.
          <p>
            Um passo de cada vez.
            <br />
            Todos os dias.
          </p>
          <ArrowUpRight size={18} />
        </div>
        <button onClick={logout} className="nav-item logout">
          <LogOut size={18} />
          Sair da conta
        </button>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="button-row">
            <button
              ref={toggle}
              className="icon-btn mobile-toggle"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              aria-controls="navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={23} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>{active?.label || "Início"}</strong>
            </span>
          </div>
          <div className="user-menu">
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
            <span className="user-avatar">
              {user?.name?.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>MiniERP · Mais clareza para sua operação.</span>
          <span>Feito para pequenos negócios.</span>
        </footer>
      </div>
    </div>
  );
}
