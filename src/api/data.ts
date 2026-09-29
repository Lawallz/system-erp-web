import axios from 'axios'
export function unwrap<T>(value: T | { data: T }): T {
  return value && typeof value === 'object' && 'data' in value
    ? value.data
    : (value as T)
}
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403)
      return 'Seu usuário não tem permissão para esta operação.'
    if (!error.response)
      return 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.'
    return (
      error.response.data?.message || 'Não foi possível concluir a operação.'
    )
  }
  return 'Não foi possível concluir a operação.'
}
export const money = (value: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value || 0),
  )
export const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString('pt-BR') : '—'
