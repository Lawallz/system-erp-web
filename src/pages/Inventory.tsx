import { usePermissions } from '../hooks/usePermissions'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Download,
  RefreshCw,
  Package,
  Wallet,
  Truck,
  ShoppingCart,
} from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { money } from '../api/data'
import { downloadCsv } from '../api/csv'
import { DataTable, Feedback, PageTitle, type Column } from '../components/UI'
export type InventoryRow = {
  id: string
  name: string
  sku: string
  category: string
  stockQuantity: number
  minStockAlert: number
  pendingQuantity: number
  projectedQuantity: number
  suggestedQuantity: number
  costPrice: string
  price: string
  stockCost: string
  stockRetail: string
  estimatedCost: string
  grossMarginPercent: number | null
  status: 'OUT_OF_STOCK' | 'LOW' | 'OK'
}
type InventoryReport = {
  summary: {
    activeProducts: number
    totalUnits: number
    lowStockCount: number
    productsToReorder: number
    costValue: string
    retailValue: string
    estimatedReorderCost: string
  }
  products: InventoryRow[]
}
export function Inventory() {
  const can = usePermissions()
  const resource = useResource<InventoryReport>('/reports/inventory')
  const [filter, setFilter] = useState('reorder')
  const [query, setQuery] = useState('')
  const data = resource.data
  const rows = (data?.products || []).filter(
    (row) =>
      (filter === 'all' ||
        (filter === 'reorder'
          ? row.suggestedQuantity > 0
          : filter === 'out'
            ? row.stockQuantity === 0
            : row.pendingQuantity > 0)) &&
      `${row.name} ${row.sku} ${row.category}`
        .toLocaleLowerCase('pt-BR')
        .includes(query.toLocaleLowerCase('pt-BR')),
  )
  const columns: Column<InventoryRow>[] = [
    {
      label: 'Produto',
      render: (row) => (
        <div className="cell-name">
          {row.name}
          <small>
            {row.sku} · {row.category}
          </small>
        </div>
      ),
    },
    {
      label: 'Em estoque',
      render: (row) => (
        <span className={`badge ${row.status !== 'OK' ? 'warning' : ''}`}>
          {row.stockQuantity} un.
        </span>
      ),
    },
    { label: 'Mínimo', render: (row) => row.minStockAlert },
    {
      label: 'A receber',
      render: (row) => <span>{row.pendingQuantity} un.</span>,
    },
    {
      label: 'Comprar',
      render: (row) => <strong>{row.suggestedQuantity} un.</strong>,
    },
    { label: 'Custo estimado', render: (row) => money(row.estimatedCost) },
    { label: 'Valor em estoque', render: (row) => money(row.stockCost) },
  ]
  function exportPlan() {
    downloadCsv(
      'plano-de-reposicao.csv',
      [
        'Produto',
        'SKU',
        'Categoria',
        'Em estoque',
        'Estoque mínimo',
        'A receber',
        'Saldo projetado',
        'Quantidade sugerida',
        'Custo unitário',
        'Custo de reposição',
        'Valor do estoque a custo',
      ],
      rows.map((row) => [
        row.name,
        row.sku,
        row.category,
        row.stockQuantity,
        row.minStockAlert,
        row.pendingQuantity,
        row.projectedQuantity,
        row.suggestedQuantity,
        row.costPrice,
        row.estimatedCost,
        row.stockCost,
      ]),
    )
  }
  return (
    <>
      <PageTitle
        title="Reposição de estoque"
        description="Planeje as próximas compras com o que você tem e o que já está a caminho."
        action={
          <div className="row-actions">
            <button
              className="icon-btn"
              aria-label="Atualizar reposição"
              onClick={resource.reload}
            >
              <RefreshCw size={18} />
            </button>
            <button
              className="btn"
              onClick={exportPlan}
              disabled={
                resource.loading || Boolean(resource.error) || !rows.length
              }
            >
              <Download size={16} />
              Exportar plano
            </button>
          </div>
        }
      />
      <Feedback {...resource} retry={resource.reload} />
      {data && !resource.loading && !resource.error && (
        <>
          <div className="overview-banner">
            <div>
              <p className="eyebrow">COMPRAS COM MAIS CONTROLE</p>
              <h2>
                {data.summary.productsToReorder
                  ? `${data.summary.productsToReorder} produtos precisam de reposição.`
                  : 'Nenhuma compra adicional sugerida.'}
              </h2>
              <p>Compras pendentes já são descontadas da sugestão.</p>
            </div>
            {can('purchases:read') && (
              <Link className="btn light" to="/purchases">
                Abrir compras <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
          <div className="metrics">
            {[
              {
                label: 'Estoque a custo',
                value: money(data.summary.costValue),
                note: 'Quantidade × custo cadastrado',
                icon: Wallet,
              },
              {
                label: 'Valor potencial de venda',
                value: money(data.summary.retailValue),
                note: 'Não representa receita realizada',
                icon: ShoppingCart,
              },
              {
                label: 'Reposição estimada',
                value: money(data.summary.estimatedReorderCost),
                note: 'Para atingir o mínimo configurado',
                icon: Truck,
              },
              {
                label: 'Unidades disponíveis',
                value: data.summary.totalUnits,
                note: `${data.summary.activeProducts} produtos ativos`,
                icon: Package,
              },
            ].map(({ label, value, note, icon: Icon }) => (
              <div className="metric" key={label}>
                <div className="metric-top">
                  <span>{label}</span>
                  <span className="metric-icon green">
                    <Icon size={20} />
                  </span>
                </div>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="inventory-tools">
            <div className="tabs" aria-label="Filtro de reposição">
              {[
                { id: 'reorder', label: 'Comprar agora' },
                { id: 'out', label: 'Sem estoque' },
                { id: 'pending', label: 'A caminho' },
                { id: 'all', label: 'Todos' },
              ].map((item) => (
                <button
                  key={item.id}
                  aria-pressed={filter === item.id}
                  className={filter === item.id ? 'selected' : ''}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="search">
              <input
                aria-label="Buscar no plano"
                placeholder="Buscar produto, SKU ou categoria…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          {rows.length ? (
            <DataTable
              key={`${filter}:${query}`}
              rows={rows}
              columns={columns}
              searchText={(row) => `${row.name} ${row.sku}`}
              showSearch={false}
            />
          ) : (
            <div className="panel empty">
              <Package size={30} />
              <h3>Nenhum produto neste filtro</h3>
              <p>
                Confira os outros filtros ou ajuste os estoques mínimos no
                catálogo.
              </p>
              {can('products:read') && (
                <Link className="text-link" to="/products">
                  Abrir produtos <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
          )}
          <p className="footnote">
            Sugestão = mínimo − estoque atual − compras pendentes, nunca abaixo
            de zero. O plano considera apenas produtos ativos e não prevê
            demanda futura. Os valores usam o custo cadastrado, não incluem
            frete ou impostos e não criam pedidos automaticamente. Produtos
            exatamente no mínimo podem ter alerta de estoque, mas sugestão zero.
          </p>
        </>
      )}
    </>
  )
}
