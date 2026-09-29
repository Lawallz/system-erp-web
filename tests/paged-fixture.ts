// Adapter helper for legacy CRUD regression fixtures under the paginated API.
export function pagedFixture(url: string, responses: Record<string, unknown>) {
  const parsed = new URL(url, 'http://test')
  const params = parsed.searchParams
  let data = responses[url] ?? responses[parsed.pathname] ?? { data: [] }
  if (!params.has('page')) return data
  if (params.get('status') === 'inactive')
    data = responses[`${parsed.pathname}?status=inactive`] ?? data
  let rows = Array.isArray(data)
    ? data
    : (data as { data: Record<string, unknown>[] }).data
  const q = (params.get('q') || '').toLowerCase()
  rows = rows.filter(
    (row) =>
      (!q || JSON.stringify(row).toLowerCase().includes(q)) &&
      (!params.get('categoryId') ||
        row.categoryId === params.get('categoryId')) &&
      (params.get('stock') !== 'out' || row.stockQuantity === 0),
  )
  const page = Number(params.get('page')),
    limit = Number(params.get('limit'))
  return {
    data: {
      items: rows.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        pageSize: limit,
        total: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / limit)),
      },
    },
  }
}
