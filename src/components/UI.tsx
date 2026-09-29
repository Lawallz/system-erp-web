import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Inbox, RefreshCw, Search, X } from 'lucide-react'
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">WORKSPACE / GESTÃO</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Feedback({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: string
  retry: () => void
}) {
  if (loading)
    return (
      <div className="empty" role="status">
        <RefreshCw className="animate-spin" size={22} />
        <p>Carregando informações…</p>
      </div>
    )
  if (error)
    return (
      <div className="notice error" role="alert">
        {error}
        <button className="btn" onClick={retry}>
          Tentar novamente
        </button>
      </div>
    )
  return null
}
export function Modal({
  title,
  children,
  close,
  busy = false,
}: {
  title: string
  children: ReactNode
  close: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => {
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) close()
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-btn"
          disabled={busy}
          aria-label="Fechar"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export type Column<T> = { label: string; render: (row: T) => ReactNode }
export function DataTable<T>({
  rows,
  columns,
  searchText,
}: {
  rows: T[]
  columns: Column<T>[]
  searchText: (row: T) => string
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const filtered = rows.filter((row) =>
    searchText(row)
      .toLocaleLowerCase('pt-BR')
      .includes(search.toLocaleLowerCase('pt-BR')),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const current = Math.min(page, pages)
  return (
    <div className="panel">
      <div className="table-toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar registros"
            placeholder="Buscar nesta lista…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <span className="muted">{filtered.length} registros</span>
      </div>
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((current - 1) * 10, current * 10)
                .map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={column.label}>{column.render(row)}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Inbox size={30} />
          <h3>
            {search
              ? 'Nenhum resultado encontrado'
              : 'Tudo pronto para começar'}
          </h3>
          <p>
            {search
              ? 'Tente outro termo de busca.'
              : 'Os registros aparecerão aqui assim que forem cadastrados.'}
          </p>
        </div>
      )}
      <div className="pagination">
        <span>
          Página {current} de {pages}
        </span>
        <div>
          <button
            className="btn"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </button>
          <button
            className="btn"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}
