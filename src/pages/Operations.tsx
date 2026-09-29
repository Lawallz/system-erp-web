import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../api/http'
import { date, errorMessage, money } from '../api/data'
import { useResource } from '../hooks/useResource'
import {
  DataTable,
  Feedback,
  Modal,
  PageTitle,
  type Column,
} from '../components/UI'
import { SelectField, type RecordRow } from './Catalog'
type Item = {
  id: string
  product: { name: string }
  quantity: number
  subtotal: string
}
type Operation = {
  id: string
  createdAt: string
  totalAmount: string
  status: string
  supplier?: { name: string }
  product?: { name: string }
  user?: { name: string }
  type?: string
  quantity?: number
  reason?: string
  items: Item[]
}
const movementNames: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venda',
  ADJUSTMENT_IN: 'Ajuste de entrada',
  ADJUSTMENT_OUT: 'Ajuste de saída',
  RETURN: 'Devolução',
  LOSS: 'Perda',
}
export function Operations({
  module,
}: {
  module: 'sales' | 'purchases' | 'stock'
}) {
  const path = module === 'stock' ? '/stock/movements' : `/${module}`
  const resource = useResource<Operation[]>(path)
  const [mode, setMode] = useState<'create' | Operation | null>(null)
  const [notice, setNotice] = useState('')
  const title = { sales: 'Vendas', purchases: 'Compras', stock: 'Estoque' }[
    module
  ]
  const columns: Column<Operation>[] = [
    {
      label: 'Registro',
      render: (row) => (
        <div className="cell-name">
          {module === 'stock'
            ? row.product?.name
            : `#${row.id.slice(0, 8).toUpperCase()}`}
          <small>{date(row.createdAt)}</small>
        </div>
      ),
    },
  ]
  if (module === 'stock')
    columns.push(
      {
        label: 'Movimentação',
        render: (row) => movementNames[row.type || ''] || row.type,
      },
      { label: 'Quantidade', render: (row) => `${row.quantity} un.` },
      { label: 'Motivo', render: (row) => row.reason || '—' },
    )
  else
    columns.push(
      {
        label: module === 'purchases' ? 'Fornecedor' : 'Responsável',
        render: (row) =>
          module === 'purchases' ? row.supplier?.name : row.user?.name || '—',
      },
      {
        label: 'Total',
        render: (row) => <strong>{money(row.totalAmount)}</strong>,
      },
      {
        label: 'Status',
        render: (row) => (
          <span
            className={`badge ${row.status === 'PENDING' ? 'warning' : ''}`}
          >
            {module === 'sales'
              ? 'Concluída'
              : row.status === 'PENDING'
                ? 'Pendente'
                : row.status === 'RECEIVED'
                  ? 'Recebida'
                  : row.status}
          </span>
        ),
      },
      {
        label: 'Ações',
        render: (row) => (
          <button className="btn small" onClick={() => setMode(row)}>
            Ver detalhes
          </button>
        ),
      },
    )
  return (
    <>
      <PageTitle
        title={title}
        description={
          {
            sales: 'Registre vendas e acompanhe cada operação.',
            purchases: 'Do pedido ao recebimento, tudo sob controle.',
            stock: 'Acompanhe as entradas e saídas de cada produto.',
          }[module]
        }
        action={
          <button className="btn primary" onClick={() => setMode('create')}>
            <Plus size={17} />
            {module === 'stock'
              ? 'Nova movimentação'
              : module === 'sales'
                ? 'Nova venda'
                : 'Nova compra'}
          </button>
        }
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <Feedback {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && (
        <DataTable
          rows={resource.data || []}
          columns={columns}
          searchText={(row) =>
            [
              row.id,
              row.supplier?.name,
              row.product?.name,
              row.user?.name,
              movementNames[row.type || ''],
            ].join(' ')
          }
        />
      )}
      {mode === 'create' && (
        <OperationForm
          module={module}
          close={() => setMode(null)}
          saved={() => {
            setMode(null)
            setNotice('Operação registrada com sucesso.')
            resource.reload()
          }}
        />
      )}
      {mode && mode !== 'create' && (
        <Details
          record={mode}
          module={module}
          close={() => setMode(null)}
          changed={resource.reload}
        />
      )}
    </>
  )
}
function OperationForm({
  module,
  close,
  saved,
}: {
  module: string
  close: () => void
  saved: () => void
}) {
  const [supplierId, setSupplierId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [type, setType] = useState('ADJUSTMENT_IN')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>(
    [{ productId: '', quantity: 1 }],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    if (
      module === 'sales' &&
      new Set(items.map((item) => item.productId)).size !== items.length
    ) {
      setError('Use uma única linha por produto e ajuste sua quantidade.')
      setBusy(false)
      return
    }
    try {
      await api.post(
        module === 'stock' ? '/stock/movements' : `/${module}`,
        module === 'sales'
          ? { items }
          : module === 'purchases'
            ? { supplierId }
            : { productId, quantity, type, reason },
      )
      saved()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={
        module === 'sales'
          ? 'Nova venda'
          : module === 'purchases'
            ? 'Nova compra'
            : 'Nova movimentação'
      }
      close={close}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {module === 'purchases' ? (
            <>
              <label>
                Fornecedor
                <SelectField
                  field={{
                    key: 'supplierId',
                    label: 'Fornecedor',
                    source: '/suppliers',
                  }}
                  value={supplierId}
                  onChange={setSupplierId}
                />
              </label>
              <p className="muted">
                O pedido será criado como pendente. Abra os detalhes para
                adicionar produtos e confirmar o recebimento.
              </p>
            </>
          ) : module === 'stock' ? (
            <>
              <label>
                Produto
                <SelectField
                  field={{
                    key: 'productId',
                    label: 'Produto',
                    source: '/products',
                  }}
                  value={productId}
                  onChange={setProductId}
                />
              </label>
              <label>
                Tipo
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  {Object.entries(movementNames)
                    .filter(([key]) => key !== 'SALE' && key !== 'PURCHASE')
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Quantidade
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>
              <label>
                Motivo
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            </>
          ) : (
            <div className="full-width">
              <SaleItems items={items} change={setItems} />
              <p className="footnote">
                A confirmação registra a venda e baixa o estoque. Os preços são
                calculados pelo servidor.
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            {busy
              ? 'Registrando…'
              : module === 'sales'
                ? 'Confirmar venda'
                : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
function SaleItems({
  items,
  change,
}: {
  items: { productId: string; quantity: number }[]
  change: (items: { productId: string; quantity: number }[]) => void
}) {
  const products = useResource<RecordRow[]>('/products')
  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(
        products.data?.find((product) => product.id === item.productId)
          ?.price || 0,
      ) *
        item.quantity,
    0,
  )
  return (
    <>
      <Feedback {...products} retry={products.reload} />
      {items.map((item, index) => (
        <div className="sale-line" key={index}>
          <label>
            Produto
            <select
              required
              value={item.productId}
              onChange={(event) =>
                change(
                  items.map((row, i) =>
                    i === index
                      ? { ...row, productId: event.target.value }
                      : row,
                  ),
                )
              }
            >
              <option value="">Selecione</option>
              {products.data
                ?.filter((product) => product.isActive !== false)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {money(product.price)} ·{' '}
                    {product.stockQuantity} un.
                  </option>
                ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              required
              type="number"
              min="1"
              step="1"
              value={item.quantity}
              onChange={(event) =>
                change(
                  items.map((row, i) =>
                    i === index
                      ? { ...row, quantity: Number(event.target.value) }
                      : row,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remover item ${index + 1}`}
            disabled={items.length === 1}
            onClick={() => change(items.filter((_, i) => i !== index))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => change([...items, { productId: '', quantity: 1 }])}
      >
        <Plus size={16} />
        Adicionar produto
      </button>
      <div className="sale-total">
        Total estimado<strong>{money(total)}</strong>
      </div>
    </>
  )
}
function Details({
  record,
  module,
  close,
  changed,
}: {
  record: Operation
  module: string
  close: () => void
  changed: () => void
}) {
  const resource = useResource<Operation>(
    module === 'purchases' ? `/purchases/${record.id}` : null,
  )
  // Sales do not expose an individual endpoint; the list already includes their items.
  const data = module === 'purchases' ? resource.data : record
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  async function add(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post(`/purchases/${record.id}/items`, {
        productId,
        quantity,
        unitCost: Number(unitCost),
      })
      setProductId('')
      setUnitCost('')
      setQuantity(1)
      resource.reload()
      changed()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function receive() {
    setBusy(true)
    setError('')
    try {
      await api.patch(`/purchases/${record.id}/receive`)
      resource.reload()
      changed()
      setConfirm(false)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`${module === 'sales' ? 'Venda' : 'Compra'} #${record.id.slice(0, 8)}`}
      close={close}
      busy={busy}
    >
      {module === 'purchases' && (
        <Feedback {...resource} retry={resource.reload} />
      )}
      {data && (
        <div className="detail-body">
          <p className="muted">
            {date(data.createdAt)} · {data.supplier?.name || data.user?.name}
          </p>
          <div className="detail-items">
            {data.items?.length ? (
              data.items.map((item) => (
                <div key={item.id}>
                  <span>
                    {item.product.name}
                    <small>{item.quantity} unidades</small>
                  </span>
                  <strong>{money(item.subtotal)}</strong>
                </div>
              ))
            ) : (
              <p className="empty">Nenhum item adicionado.</p>
            )}
          </div>
          <div className="sale-total">
            Total<strong>{money(data.totalAmount)}</strong>
          </div>
          {module === 'purchases' && data.status === 'PENDING' && (
            <>
              <form onSubmit={add}>
                <h3>Adicionar item</h3>
                <div className="form-grid">
                  <label>
                    Produto
                    <SelectField
                      field={{
                        key: 'productId',
                        label: 'Produto',
                        source: '/products',
                      }}
                      value={productId}
                      onChange={setProductId}
                    />
                  </label>
                  <label>
                    Quantidade
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    Custo unitário (R$)
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={unitCost}
                      onChange={(event) => setUnitCost(event.target.value)}
                    />
                  </label>
                </div>
                <button className="btn" disabled={busy}>
                  Adicionar ao pedido
                </button>
              </form>
              <div className="dialog-actions">
                {confirm ? (
                  <>
                    <p>Confirmar recebimento e entrada no estoque?</p>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => setConfirm(false)}
                    >
                      Voltar
                    </button>
                    <button
                      className="btn primary"
                      disabled={busy}
                      onClick={receive}
                    >
                      Confirmar recebimento
                    </button>
                  </>
                ) : (
                  <button
                    className="btn primary"
                    disabled={busy || !data.items?.length || resource.loading}
                    onClick={() => setConfirm(true)}
                  >
                    Receber compra
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  )
}
