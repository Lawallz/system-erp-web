import { useState } from 'react'
import { Download } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { DataTable, Feedback, PageTitle, type Column } from '../components/UI'
import { money } from '../api/data'
import type { RecordRow } from './Catalog'
type Report = {
  [key: string]: unknown
  topProducts?: RecordRow[]
  lowStockProducts?: RecordRow[]
  productsWithoutMovement?: RecordRow[]
  products?: RecordRow[]
}
const labels: Record<string, string> = {
  totalSales: 'Vendas realizadas',
  totalRevenue: 'Receita total',
  averageTicket: 'Ticket médio',
  totalProducts: 'Produtos',
  totalQuantity: 'Unidades em estoque',
  lowStockCount: 'Estoque baixo',
  activeProducts: 'Produtos ativos',
  inactiveProducts: 'Produtos inativos',
}
const tabs = [
  { id: 'sales', label: 'Vendas' },
  { id: 'stock', label: 'Estoque' },
  { id: 'products', label: 'Produtos' },
  { id: 'abc', label: 'Curva ABC' },
]
function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`
}
export function Reports() {
  const [tab, setTab] = useState('sales')
  const resource = useResource<Report>(`/reports/${tab}`)
  const data = resource.data
  const rows =
    data?.topProducts ||
    data?.lowStockProducts ||
    data?.productsWithoutMovement ||
    data?.products ||
    []
  const columns: Column<RecordRow>[] = [
    {
      label: 'Produto',
      render: (row) => (
        <div className="cell-name">
          {row.name}
          <small>{row.sku}</small>
        </div>
      ),
    },
  ]
  if (tab === 'sales' || tab === 'abc')
    columns.push({ label: 'Receita', render: (row) => money(row.revenue) })
  if (tab === 'sales')
    columns.push({
      label: 'Quantidade',
      render: (row) => String(row.quantity),
    })
  if (tab === 'stock' || tab === 'products')
    columns.push({ label: 'Estoque', render: (row) => row.stockQuantity })
  if (tab === 'stock')
    columns.push({
      label: 'Estoque mínimo',
      render: (row) => row.minStockAlert,
    })
  if (tab === 'abc')
    columns.push(
      { label: 'Participação', render: (row) => `${row.percentage}%` },
      { label: 'Acumulado', render: (row) => `${row.accumulatedPercentage}%` },
      {
        label: 'Classe',
        render: (row) => (
          <span className="badge">{String(row.classification)}</span>
        ),
      },
    )
  function download() {
    const keys =
      tab === 'abc'
        ? [
            'name',
            'sku',
            'revenue',
            'percentage',
            'accumulatedPercentage',
            'classification',
          ]
        : tab === 'sales'
          ? ['name', 'sku', 'revenue', 'quantity']
          : ['name', 'sku', 'stockQuantity', 'minStockAlert']
    const csv = [
      keys.map(csvCell).join(';'),
      ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(';')),
    ].join('\r\n')
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `relatorio-${tab}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <>
      <PageTitle
        title="Relatórios"
        description="Transforme os dados da operação em decisões informadas."
        action={
          <button
            className="btn"
            disabled={
              resource.loading || Boolean(resource.error) || !rows.length
            }
            onClick={download}
          >
            <Download size={16} />
            Exportar tabela CSV
          </button>
        }
      />
      <div className="tabs" aria-label="Tipo de relatório">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? 'selected' : ''}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Feedback {...resource} retry={resource.reload} />
      {data && !resource.loading && !resource.error && (
        <>
          <div className="metrics report-metrics">
            {Object.entries(data)
              .filter(([, value]) => typeof value === 'number')
              .map(([key, value]) => (
                <div className="metric" key={key}>
                  <span>{labels[key] || key}</span>
                  <strong>
                    {key === 'totalRevenue' || key === 'averageTicket'
                      ? money(value)
                      : String(value)}
                  </strong>
                  <small>Todo o período</small>
                </div>
              ))}
          </div>
          <h2 className="section-title">
            {
              {
                sales: 'Produtos com maior receita',
                stock: 'Produtos com estoque baixo',
                products: 'Produtos sem movimentação',
                abc: 'Classificação por receita acumulada',
              }[tab]
            }
          </h2>
          <DataTable
            key={tab}
            rows={rows}
            columns={columns}
            searchText={(row) => `${row.name} ${row.sku}`}
          />
        </>
      )}
    </>
  )
}
