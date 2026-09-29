import { useEffect, useState } from 'react'
import { useResource } from './useResource'
export type PageData<T> = {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
export function useDebounced(value: string, delay = 250) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return settled
}
export function usePagedResource<T>(
  path: string | null,
  extra: Record<string, string> = {},
) {
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(20)
  const q = useDebounced(query)
  const filterKey = JSON.stringify([path, q, from, to, limit, extra])
  const [position, setPosition] = useState({ key: '', page: 1 })
  const page = position.key === filterKey ? position.page : 1
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...extra,
  })
  if (q) params.set('q', q)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const resource = useResource<PageData<T>>(path ? `${path}?${params}` : null)
  return {
    ...resource,
    query,
    setQuery,
    from,
    setFrom,
    to,
    setTo,
    limit,
    setLimit,
    page,
    setPage: (value: number) => setPosition({ key: filterKey, page: value }),
    clear: () => {
      setQuery('')
      setFrom('')
      setTo('')
    },
  }
}
