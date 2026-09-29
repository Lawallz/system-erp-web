import { useEffect, useState } from 'react'
import { api } from '../api/http'
import { errorMessage, unwrap } from '../api/data'
export function useResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    key: string
    data: T | null
    error: string
  } | null>(null)
  const key = `${path}:${revision}`
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    api
      .get(path, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({ key, data: unwrap<T>(response.data), error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ key, data: null, error: errorMessage(error) })
      })
    return () => controller.abort()
  }, [path, key])
  const current = result?.key === key ? result : null
  return {
    data: current?.data ?? null,
    error: current?.error ?? '',
    loading: Boolean(path && !current),
    reload: () => setRevision((value) => value + 1),
  }
}
