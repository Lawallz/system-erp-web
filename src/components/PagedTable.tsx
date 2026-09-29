import { type ReactNode } from 'react'
import type { Column } from './UI'
import { Feedback } from './UI'
import type { usePagedResource } from '../hooks/usePagedResource'
export type PagedResource<T> = ReturnType<typeof usePagedResource<T>>
export function ListFilters<T>({
  resource,
  dates = true,
}: {
  resource: PagedResource<T>
  dates?: boolean
}) {
  return (
    <div className="catalog-filters">
      <label>
        Buscar registros
        <input
          type="search"
          placeholder="Buscar no servidor…"
          value={resource.query}
          onChange={(event) => resource.setQuery(event.target.value)}
        />
      </label>
      {dates && (
        <>
          <label>
            De
            <input
              type="date"
              value={resource.from}
              max={resource.to || undefined}
              onChange={(event) => resource.setFrom(event.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={resource.to}
              min={resource.from || undefined}
              onChange={(event) => resource.setTo(event.target.value)}
            />
          </label>
        </>
      )}
      <label>
        Por página
        <select
          value={resource.limit}
          onChange={(event) => resource.setLimit(Number(event.target.value))}
        >
          {[10, 20, 50].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button className="btn" onClick={resource.clear}>
        Limpar busca e datas
      </button>
    </div>
  )
}
export function PagedTable<T extends { id: string }>({
  resource,
  columns,
  empty,
}: {
  resource: PagedResource<T>
  columns: Column<T>[]
  empty?: ReactNode
}) {
  const rows = resource.data?.items || []
  const pagination = resource.data?.pagination
  return (
    <>
      <Feedback {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && (
        <div className="panel">
          {rows.length ? (
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
                  {rows.map((row) => (
                    <tr key={row.id}>
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
              <h3>Nenhum registro encontrado</h3>
              <p>{empty || 'Tente ajustar a busca ou o período.'}</p>
            </div>
          )}
          <div className="pagination">
            <span>
              {pagination?.total || 0} registros · Página {resource.page} de{' '}
              {pagination?.totalPages || 1}
            </span>
            <div>
              <button
                className="btn"
                disabled={resource.page <= 1}
                onClick={() => resource.setPage(resource.page - 1)}
              >
                Anterior
              </button>
              <button
                className="btn"
                disabled={resource.page >= (pagination?.totalPages || 1)}
                onClick={() => resource.setPage(resource.page + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
