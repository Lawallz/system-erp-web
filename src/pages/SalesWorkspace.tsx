import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Minus,
  Plus,
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { api } from '../api/http'
import { errorMessage, money, unwrap } from '../api/data'
import { usePermissions } from '../hooks/usePermissions'
import { usePagedResource } from '../hooks/usePagedResource'
import { Feedback, Modal, PageTitle } from '../components/UI'
type Product = {
  id: string
  name: string
  sku: string
  barcode: string | null
  price: string
  stockQuantity: number
}
type Line = { product: Product; quantity: number }
type Receipt = { id: string; totalAmount: string }
export function SalesWorkspace() {
  const can = usePermissions()
  const catalog = usePagedResource<Product>('/sales/catalog')
  const [lines, setLines] = useState<Line[]>([])
  const cart = useRef<Line[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [pendingScans, setPendingScans] = useState(0)
  const queue = useRef(Promise.resolve())
  const alive = useRef(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState(false)
  const [clear, setClear] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const total = lines.reduce(
    (sum, line) => sum + Number(line.product.price) * line.quantity,
    0,
  )
  function update(next: Line[]) {
    cart.current = next
    setLines(next)
  }
  function add(product: Product) {
    if (saving.current) return
    const current = cart.current.find((line) => line.product.id === product.id)
    const quantity = (current?.quantity || 0) + 1
    if (quantity > product.stockQuantity) {
      setError(
        `Saldo insuficiente para ${product.name}. Disponível: ${product.stockQuantity}.`,
      )
      return
    }
    update(
      current
        ? cart.current.map((line) =>
            line.product.id === product.id ? { product, quantity } : line,
          )
        : [...cart.current, { product, quantity }],
    )
    setReceipt(null)
    setError('')
    searchRef.current?.focus()
  }
  function change(id: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || saving.current) return
    const line = cart.current.find((item) => item.product.id === id)!
    if (quantity > line.product.stockQuantity) {
      setError(
        `Limite disponível: ${line.product.stockQuantity} unidades de ${line.product.name}.`,
      )
      return
    }
    update(
      cart.current.map((item) =>
        item.product.id === id ? { ...item, quantity } : item,
      ),
    )
    setError('')
  }
  function lookup(event: FormEvent) {
    event.preventDefault()
    const code = catalog.query.trim()
    if (!code || saving.current) return
    catalog.setQuery('')
    setPendingScans((value) => value + 1)
    // Serialize scans so repeated reads of the same item increment reliably.
    queue.current = queue.current.then(async () => {
      if (!alive.current) return
      try {
        const response = await api.get('/sales/lookup', { params: { code } })
        if (alive.current) add(unwrap<Product>(response.data))
      } catch (error) {
        if (alive.current) setError(errorMessage(error))
      } finally {
        if (alive.current) setPendingScans((value) => value - 1)
      }
    })
  }
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'F2') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (event.key === 'F4') {
        event.preventDefault()
        if (lines.length && !busy && !pendingScans) setConfirm(true)
      }
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (lines.length) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [lines.length, busy, pendingScans])
  async function checkout() {
    if (
      saving.current ||
      !cart.current.length ||
      pendingScans ||
      !can('sales:create')
    )
      return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const response = await api.post('/sales', {
        items: cart.current.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      })
      if (!alive.current) return
      setReceipt(unwrap<Receipt>(response.data))
      update([])
      setConfirm(false)
      catalog.reload()
      searchRef.current?.focus()
    } catch (error) {
      if (alive.current)
        setError(
          `${errorMessage(error)} O carrinho foi mantido. Se houve falha de conexão, confira o histórico de vendas antes de tentar novamente.`,
        )
    } finally {
      saving.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <>
      <PageTitle
        title="Venda rápida"
        description="Busque, adicione ao carrinho e confira antes de finalizar."
        action={
          can('sales:read') ? (
            <Link className="btn" to="/sales">
              Histórico de vendas
            </Link>
          ) : undefined
        }
      />
      {receipt && (
        <div className="notice" role="status">
          Venda #{receipt.id.slice(0, 8)} registrada. Total confirmado:{' '}
          {money(receipt.totalAmount)}.
        </div>
      )}
      {error && !confirm && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="pos-layout">
        <section className="panel pos-catalog">
          <form className="pos-search" onSubmit={lookup}>
            <Search size={20} />
            <input
              ref={searchRef}
              type="search"
              aria-label="Buscar produto, SKU ou código de barras"
              placeholder="Nome, SKU ou código de barras…"
              value={catalog.query}
              maxLength={100}
              onChange={(event) => catalog.setQuery(event.target.value)}
              disabled={busy}
            />
            <button
              className="btn"
              type="submit"
              disabled={busy || !catalog.query.trim()}
            >
              <ScanBarcode size={17} />
              Ler código
            </button>
          </form>
          <p className="pos-hint">
            F2: buscar · Enter: adicionar código exato · F4: revisar venda.
            Scanner USB deve enviar Enter ao final da leitura. O carrinho não é
            salvo ao sair desta tela.
          </p>
          {pendingScans > 0 && (
            <p className="pos-hint" role="status">
              Processando {pendingScans} leitura(s)…
            </p>
          )}
          <Feedback {...catalog} retry={catalog.reload} />
          {!catalog.loading && !catalog.error && (
            <>
              <div className="product-grid">
                {catalog.data?.items.map((product) => (
                  <button
                    key={product.id}
                    className="product-choice"
                    disabled={busy || product.stockQuantity <= 0}
                    onClick={() => add(product)}
                  >
                    <span className="product-code">{product.sku}</span>
                    <strong>{product.name}</strong>
                    <span className="product-price">
                      {money(product.price)}
                    </span>
                    <span
                      className={`badge ${product.stockQuantity ? '' : 'warning'}`}
                    >
                      {product.stockQuantity
                        ? `${product.stockQuantity} em estoque`
                        : 'Sem estoque'}
                    </span>
                    <span className="text-link">
                      <Plus size={14} />
                      Adicionar
                    </span>
                  </button>
                ))}
              </div>
              {!catalog.data?.items.length && (
                <p className="empty">
                  Nenhum produto encontrado. Tente outro nome ou código.
                </p>
              )}
              <div className="pagination">
                <span>
                  {catalog.data?.pagination.total || 0} produtos · página{' '}
                  {catalog.page}
                </span>
                <div>
                  <button
                    className="btn"
                    disabled={catalog.page <= 1}
                    onClick={() => catalog.setPage(catalog.page - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="btn"
                    disabled={
                      catalog.page >= (catalog.data?.pagination.totalPages || 1)
                    }
                    onClick={() => catalog.setPage(catalog.page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
        <aside className="panel cart">
          <div className="panel-head">
            <div>
              <h2>
                <ShoppingCart size={18} /> Carrinho
              </h2>
              <p>
                {lines.reduce((sum, line) => sum + line.quantity, 0)} unidades ·{' '}
                {lines.length} produtos
              </p>
            </div>
            <button
              className="icon-btn"
              aria-label="Limpar carrinho"
              disabled={!lines.length || busy || Boolean(pendingScans)}
              onClick={() => setClear(true)}
            >
              <Trash2 size={17} />
            </button>
          </div>
          {!lines.length ? (
            <div className="empty">
              <ShoppingCart size={30} />
              <h3>Comece adicionando um produto</h3>
              <p>Você pode buscar ou usar o leitor USB.</p>
            </div>
          ) : (
            <div className="cart-items">
              {lines.map((line) => (
                <div className="cart-line" key={line.product.id}>
                  <div>
                    <strong>{line.product.name}</strong>
                    <small>
                      {line.product.sku} · {money(line.product.price)} / un.
                    </small>
                  </div>
                  <button
                    className="icon-btn"
                    disabled={busy}
                    aria-label={`Remover ${line.product.name}`}
                    onClick={() =>
                      update(
                        cart.current.filter(
                          (item) => item.product.id !== line.product.id,
                        ),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                  <div className="quantity-control">
                    <button
                      className="icon-btn"
                      disabled={busy || line.quantity === 1}
                      aria-label={`Diminuir ${line.product.name}`}
                      onClick={() => change(line.product.id, line.quantity - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={line.product.stockQuantity}
                      step={1}
                      disabled={busy}
                      aria-label={`Quantidade de ${line.product.name}`}
                      value={line.quantity}
                      onChange={(event) =>
                        change(line.product.id, Number(event.target.value))
                      }
                    />
                    <button
                      className="icon-btn"
                      disabled={
                        busy || line.quantity >= line.product.stockQuantity
                      }
                      aria-label={`Aumentar ${line.product.name}`}
                      onClick={() => change(line.product.id, line.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <strong className="line-total">
                    {money(Number(line.product.price) * line.quantity)}
                  </strong>
                </div>
              ))}
            </div>
          )}
          <div className="cart-footer">
            <div className="sale-total">
              Total estimado<strong>{money(total)}</strong>
            </div>
            <p className="footnote">
              O servidor valida o saldo e os preços ao confirmar. Esta operação
              registra a venda; não processa pagamentos.
            </p>
            <button
              className="btn primary"
              disabled={!lines.length || busy || Boolean(pendingScans)}
              onClick={() => setConfirm(true)}
            >
              Revisar venda · F4
            </button>
          </div>
        </aside>
      </div>
      {confirm && (
        <Modal
          title="Confirmar venda"
          close={() => setConfirm(false)}
          busy={busy}
        >
          <div className="detail-body">
            <p>
              {lines.length} produtos ·{' '}
              {lines.reduce((sum, line) => sum + line.quantity, 0)} unidades.
            </p>
            <div className="sale-total">
              Total estimado<strong>{money(total)}</strong>
            </div>
            <p className="muted">
              A confirmação registra a venda e baixa o estoque.
            </p>
            {error && (
              <div role="alert" className="notice error">
                {error}
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="btn"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Voltar ao carrinho
              </button>
              <button
                className="btn primary"
                disabled={busy}
                onClick={checkout}
              >
                {busy ? 'Registrando…' : 'Confirmar venda'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {clear && (
        <Modal title="Limpar carrinho?" close={() => setClear(false)}>
          <div className="detail-body">
            <p>Os itens desta venda ainda não foram registrados.</p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setClear(false)}>
                Manter itens
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  update([])
                  setClear(false)
                  setError('')
                }}
              >
                Limpar itens
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
