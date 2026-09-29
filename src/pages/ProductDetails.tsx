import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useResource } from '../hooks/useResource'
import { usePagedResource } from '../hooks/usePagedResource'
import { Feedback, PageTitle, type Column } from '../components/UI'
import { ListFilters, PagedTable } from '../components/PagedTable'
import { date, money } from '../api/data'
import type { RecordRow } from './Catalog'
const tabs = [
  { id: 'movements', label: 'Movimentações', permission: 'stock:read' },
  { id: 'sales', label: 'Vendas', permission: 'sales:read' },
  { id: 'purchases', label: 'Compras', permission: 'purchases:read' },
]
type HistoryRow = {
  id: string
  quantity: number
  type?: string
  reason?: string
  previousStock?: number
  newStock?: number
  createdAt: string
  unitPrice?: string
  unitCost?: string
  subtotal?: string
  user?: { name: string }
  sale?: { id: string; createdAt: string; user: { name: string } }
  purchase?: {
    id: string
    createdAt: string
    status: string
    supplier: { name: string }
  }
}
export function ProductDetails() {
  const { id } = useParams()
  const resource = useResource<RecordRow>(`/products/${id}`)
  const can = usePermissions()
  const allowed = tabs.filter((tab) => can(tab.permission))
  const [selected, setSelected] = useState('movements')
  const active =
    allowed.find((tab) => tab.id === selected)?.id || allowed[0]?.id
  const product = resource.data
  return (
    <>
      <PageTitle
        title={product?.name || 'Detalhes do produto'}
        description="Cadastro e histórico da operação em um só lugar."
        action={
          <Link className="btn" to="/products">
            Voltar aos produtos
          </Link>
        }
      />
      <Feedback {...resource} retry={resource.reload} />
      {product && !resource.loading && !resource.error && (
        <>
          <div className="panel product-summary">
            <div>
              <span className={`badge ${product.isActive ? '' : 'neutral'}`}>
                {product.isActive ? 'Ativo' : 'Inativo'}
              </span>
              <h2>{product.name}</h2>
              <p>{product.description || 'Sem descrição cadastrada.'}</p>
              <small>
                SKU: {product.sku} · Código de barras:{' '}
                {product.barcode || 'Não informado'} · {product.category?.name}
              </small>
            </div>
          </div>
          <div className="metrics">
            {[
              { label: 'Saldo atual', value: `${product.stockQuantity} un.` },
              {
                label: 'Estoque mínimo',
                value: `${product.minStockAlert} un.`,
              },
              { label: 'Preço de venda', value: money(product.price) },
              { label: 'Custo cadastrado', value: money(product.costPrice) },
            ].map((item) => (
              <div className="metric" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          {allowed.length ? (
            <>
              <div className="tabs" aria-label="Histórico do produto">
                {allowed.map((tab) => (
                  <button
                    key={tab.id}
                    aria-pressed={active === tab.id}
                    className={active === tab.id ? 'selected' : ''}
                    onClick={() => setSelected(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <ProductHistory key={`${id}:${active}`} id={id!} kind={active} />
            </>
          ) : (
            <p className="notice">
              Sua função permite consultar o cadastro, mas não os históricos
              deste produto.
            </p>
          )}
        </>
      )}
    </>
  )
}
function ProductHistory({ id, kind }: { id: string; kind: string }) {
  const resource = usePagedResource<HistoryRow>(
    `/products/${id}/history/${kind}`,
  )
  const names: Record<string, string> = {
    SALE: 'Venda',
    PURCHASE: 'Compra',
    ADJUSTMENT_IN: 'Ajuste de entrada',
    ADJUSTMENT_OUT: 'Ajuste de saída',
    RETURN: 'Devolução',
    LOSS: 'Perda',
  }
  const columns: Column<HistoryRow>[] = [
    {
      label: 'Data',
      render: (row) =>
        date(row.sale?.createdAt || row.purchase?.createdAt || row.createdAt),
    },
  ]
  if (kind === 'movements')
    columns.push(
      { label: 'Tipo', render: (row) => names[row.type || ''] || row.type },
      { label: 'Quantidade', render: (row) => row.quantity },
      {
        label: 'Saldo anterior → novo',
        render: (row) => `${row.previousStock} → ${row.newStock}`,
      },
      {
        label: 'Responsável / motivo',
        render: (row) => (
          <div>
            {row.user?.name}
            <small className="muted"> {row.reason}</small>
          </div>
        ),
      },
    )
  else
    columns.push(
      {
        label: kind === 'sales' ? 'Venda' : 'Compra',
        render: (row) =>
          `#${(row.sale?.id || row.purchase?.id || '').slice(0, 8)}`,
      },
      {
        label: kind === 'sales' ? 'Responsável' : 'Fornecedor',
        render: (row) => row.sale?.user.name || row.purchase?.supplier.name,
      },
      { label: 'Quantidade', render: (row) => row.quantity },
      {
        label: 'Valor unitário',
        render: (row) => money(row.unitPrice || row.unitCost),
      },
      { label: 'Subtotal', render: (row) => money(row.subtotal) },
    )
  if (kind === 'purchases')
    columns.push({
      label: 'Status',
      render: (row) => (
        <span className="badge">
          {row.purchase?.status === 'RECEIVED'
            ? 'Recebida'
            : row.purchase?.status === 'PENDING'
              ? 'Pendente'
              : row.purchase?.status}
        </span>
      ),
    })
  return (
    <>
      <ListFilters resource={resource} />
      <p className="footnote">
        Datas em UTC−03.{' '}
        {kind === 'purchases'
          ? 'Compras filtradas pela data de criação do pedido.'
          : kind === 'sales'
            ? 'Vendas filtradas pela data da venda; preços históricos preservados.'
            : 'Movimentações filtradas pela data do lançamento.'}
      </p>
      <PagedTable resource={resource} columns={columns} />
    </>
  )
}
