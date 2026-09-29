import {
  ArrowUpRight,
  Banknote,
  Package,
  ShoppingBag,
  ReceiptText,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { money, date } from '../api/data'
import { useResource } from '../hooks/useResource'
import { Feedback, PageTitle } from '../components/UI'
type DashboardData = {
  summary: {
    totalProducts: number
    lowStockCount: number
    totalSales: number
    totalRevenue: number
    averageTicket: number
    pendingPurchases: number
  }
  topProducts: {
    productId: string
    name: string
    sku: string
    quantity: number
    revenue: number
  }[]
  lowStockProducts: {
    id: string
    name: string
    sku: string
    stockQuantity: number
    minStockAlert: number
  }[]
  recentSales: {
    id: string
    totalAmount: string
    createdAt: string
    user: { name: string }
  }[]
}
export function Dashboard() {
  const resource = useResource<DashboardData>('/dashboard')
  const data = resource.data
  return (
    <>
      <PageTitle
        title="Sua operação, em perspectiva."
        description="Acompanhe resultados, identifique prioridades e dê o próximo passo."
        action={
          <button className="btn" onClick={resource.reload}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        }
      />
      <Feedback {...resource} retry={resource.reload} />
      {data && !resource.loading && !resource.error && (
        <>
          <div className="overview-banner">
            <div>
              <span className="eyebrow">VISÃO GERAL DO NEGÓCIO</span>
              <h2>Mais clareza. Melhores decisões.</h2>
              <p>Os números da sua operação reunidos em um só lugar.</p>
            </div>
            <Link to="/sales" className="btn light">
              <Plus size={17} />
              Registrar venda
            </Link>
          </div>
          <section className="metrics">
            {[
              {
                label: 'Receita total',
                value: money(data.summary.totalRevenue),
                icon: Banknote,
                note: 'Vendas registradas',
                color: 'green',
              },
              {
                label: 'Vendas realizadas',
                value: data.summary.totalSales,
                icon: ShoppingBag,
                note: 'Operações concluídas',
                color: 'violet',
              },
              {
                label: 'Ticket médio',
                value: money(data.summary.averageTicket),
                icon: ReceiptText,
                note: 'Valor médio por venda',
                color: 'blue',
              },
              {
                label: 'Produtos ativos',
                value: data.summary.totalProducts,
                icon: Package,
                note: 'Itens no catálogo',
                color: 'orange',
              },
            ].map(({ label, value, icon: Icon, note, color }) => (
              <div className="metric" key={label}>
                <div className="metric-top">
                  <span>{label}</span>
                  <span className={`metric-icon ${color}`}>
                    <Icon size={20} />
                  </span>
                </div>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </section>
          <section className="dashboard-grid">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>Produtos em destaque</h2>
                  <p>Mais vendidos por quantidade · todo o período</p>
                </div>
                <Link to="/reports" className="text-link">
                  Relatórios <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.topProducts.length ? (
                <div className="ranking">
                  {data.topProducts.slice(0, 5).map((product, index) => (
                    <div className="ranking-row" key={product.productId}>
                      <span className="rank">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="rank-product">
                        <strong>{product.name}</strong>
                        <small>
                          {product.sku} · {product.quantity} unidades
                        </small>
                        <div className="bar-track">
                          <div
                            style={{
                              width: `${(product.quantity / Math.max(...data.topProducts.map((item) => item.quantity), 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <strong>{money(product.revenue)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <ShoppingBag size={28} />
                  <h3>Seu próximo resultado começa aqui</h3>
                  <p>Registre a primeira venda para acompanhar os destaques.</p>
                  <Link className="text-link" to="/sales">
                    Ir para vendas <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </div>
            <div className="panel attention">
              <div className="panel-head">
                <div>
                  <h2>Precisa de atenção</h2>
                  <p>Prioridades da sua operação</p>
                </div>
                <AlertTriangle size={20} />
              </div>
              <Link className="attention-card" to="/stock">
                <span className="metric-icon orange">
                  <Package size={22} />
                </span>
                <div>
                  <strong>
                    {data.summary.lowStockCount} produtos com estoque baixo
                  </strong>
                  <small>Confira as movimentações e planeje a reposição</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
              <Link className="attention-card" to="/purchases">
                <span className="metric-icon violet">
                  <ShoppingBag size={22} />
                </span>
                <div>
                  <strong>
                    {data.summary.pendingPurchases} compras pendentes
                  </strong>
                  <small>Acompanhe os pedidos e recebimentos</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
              <div className="low-stock-list">
                {data.lowStockProducts.slice(0, 4).map((product) => (
                  <div key={product.id}>
                    <span>
                      {product.name}
                      <small>Mínimo: {product.minStockAlert} un.</small>
                    </span>
                    <span className="badge warning">
                      {product.stockQuantity} un.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="panel recent">
            <div className="panel-head">
              <div>
                <h2>Últimas vendas</h2>
                <p>As movimentações mais recentes</p>
              </div>
              <Link className="text-link" to="/sales">
                Ver todas <ArrowUpRight size={16} />
              </Link>
            </div>
            {data.recentSales?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Venda</th>
                      <th>Responsável</th>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="cell-name">
                          #{sale.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td>{sale.user.name}</td>
                        <td>{date(sale.createdAt)}</td>
                        <td>
                          <strong>{money(sale.totalAmount)}</strong>
                        </td>
                        <td>
                          <span className="badge">Concluída</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">Nenhuma venda registrada ainda.</p>
            )}
          </section>
        </>
      )}
    </>
  )
}
