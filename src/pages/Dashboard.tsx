import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Package,
  ReceiptText,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { useResource } from "../hooks/useResource";
import { currency } from "../lib/format";
import { EmptyState, ErrorState, Loading, PageHeading } from "../components/ui";
type Data = {
  summary: {
    totalProducts: number;
    lowStockCount: number;
    totalSales: number;
    totalRevenue: number;
    averageTicket: number;
    pendingPurchases: number;
  };
  topProducts: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  lowStockProducts: {
    id: string;
    sku: string;
    name: string;
    stockQuantity: number;
    minStockAlert: number;
  }[];
};
export function Dashboard() {
  const { can, user } = useAuth();
  if (!can("reports:read"))
    return (
      <div className="page-enter">
        <PageHeading
          eyebrow="Seu espaço de trabalho"
          title={`Bem-vindo, ${user?.name.split(" ")[0] || ""}.`}
          description="Use as áreas disponíveis para seu perfil."
        />
        <div className="button-row">
          {can("products:read") && (
            <Link className="btn primary" to="/products">
              Ver produtos
            </Link>
          )}
          {can("sales:create") && can("products:read") && (
            <Link className="btn secondary" to="/sales">
              Iniciar venda
            </Link>
          )}
        </div>
        <p className="muted access-note">
          Os indicadores gerenciais dependem da permissão de relatórios.
        </p>
      </div>
    );
  return <Overview />;
}
function Overview() {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useResource<{ data: Data }>(
    "/dashboard",
    revision,
  );
  const { user, can } = useAuth();
  const summary = data?.data.summary;
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Visão geral / Sua operação"
        title={`Olá, ${user?.name.split(" ")[0] || "bem-vindo"}.`}
        description="Os números do seu negócio, com espaço para o que importa."
        action={
          <button
            className="btn secondary"
            disabled={loading}
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        }
      />
      <div className="overview-hero">
        <div>
          <span className="hero-tag">
            <span className="status-dot" />
            CLAREZA PARA DECIDIR
          </span>
          <h2>
            Menos planilhas.
            <br />
            <span>Mais visão de negócio.</span>
          </h2>
          <p>Seu catálogo, suas vendas e os próximos passos da operação.</p>
          <div className="button-row">
            {can("sales:create") && can("products:read") && (
              <Link to="/sales" className="btn primary">
                Começar uma venda
                <ArrowUpRight size={17} />
              </Link>
            )}
            {can("products:read") && (
              <Link to="/products" className="hero-link">
                Explorar catálogo →
              </Link>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card art-card-one">
            <span>OPERAÇÃO</span>
            <i />
            <i />
            <i />
          </div>
          <div className="art-card art-card-two">
            <Package size={32} />
            <span>TUDO EM SEU LUGAR</span>
          </div>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={() => setRevision((v) => v + 1)} />
      ) : summary && data ? (
        <>
          <div className="section-label">
            <h2>Seu negócio em números</h2>
            <span>Resumo da API</span>
          </div>
          <section className="metrics-grid" aria-label="Indicadores">
            {[
              {
                title: "Receita",
                value: currency(summary.totalRevenue),
                caption: "Vendas registradas",
                icon: Banknote,
              },
              {
                title: "Vendas",
                value: summary.totalSales,
                caption: "Operações concluídas",
                icon: ShoppingBag,
              },
              {
                title: "Ticket médio",
                value: currency(summary.averageTicket),
                caption: "Valor médio por venda",
                icon: ReceiptText,
              },
              {
                title: "Produtos ativos",
                value: summary.totalProducts,
                caption: `${summary.lowStockCount} com estoque baixo`,
                icon: Package,
              },
            ].map((m) => (
              <article className="metric-card" key={m.title}>
                <div>
                  <span>{m.title}</span>
                  <m.icon size={19} />
                </div>
                <strong>{m.value}</strong>
                <small>{m.caption}</small>
              </article>
            ))}
          </section>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">DESTAQUES DO CATÁLOGO</p>
                  <h2>Produtos mais vendidos</h2>
                </div>
                <ArrowUpRight size={20} />
              </div>
              {!data.data.topProducts.length ? (
                <EmptyState title="As próximas vendas aparecem aqui">
                  Registre uma venda para acompanhar os destaques.
                </EmptyState>
              ) : (
                <ol className="ranking">
                  {data.data.topProducts.map((p, i) => (
                    <li key={p.productId}>
                      <span className="rank-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="rank-details">
                        <strong>{p.name}</strong>
                        <small>
                          {p.quantity} unidades · {p.sku}
                        </small>
                        <div className="rank-bar">
                          <span
                            style={{
                              width: `${Math.max(2, (Number(p.revenue) / Math.max(1, ...data.data.topProducts.map((p) => Number(p.revenue)))) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <strong className="numeric">{currency(p.revenue)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">PONTOS DE ATENÇÃO</p>
                  <h2>Hora de repor</h2>
                </div>
                <span className="count-badge">{summary.lowStockCount}</span>
              </div>
              {!data.data.lowStockProducts.length ? (
                <EmptyState title="Estoque em dia">
                  Nenhum produto abaixo do mínimo informado.
                </EmptyState>
              ) : (
                <ul className="stock-list">
                  {data.data.lowStockProducts.map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          {p.sku} · mínimo {p.minStockAlert}
                        </small>
                      </div>
                      <span className="stock-badge low">
                        {p.stockQuantity} un.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="panel-footnote">
                <span>Compras pendentes</span>
                <strong>{summary.pendingPurchases}</strong>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
