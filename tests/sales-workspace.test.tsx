import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AxiosError } from 'axios'
import { api } from '../src/api/http'
import { SalesWorkspace } from '../src/pages/SalesWorkspace'
import { ProductDetails } from '../src/pages/ProductDetails'
import { Catalog } from '../src/pages/Catalog'
import { Operations } from '../src/pages/Operations'
const access = vi.hoisted(() => ({ permissions: [] as string[] }))
vi.mock('../src/hooks/usePermissions', () => ({
  usePermissions: () => (permission: string) =>
    access.permissions.includes(permission),
}))
const product = {
  id: 'p1',
  name: 'Teclado',
  sku: 'TEC-01',
  barcode: '00123',
  price: '150.00',
  costPrice: '80',
  stockQuantity: 2,
  category: { name: 'Geral' },
  isActive: true,
}
const calls: { method: string; url: string; data: unknown; params: unknown }[] =
  []
let fail = false
let delayPost: (() => Promise<void>) | undefined
beforeEach(() => {
  calls.length = 0
  fail = false
  delayPost = undefined
  access.permissions = [
    'sales:create',
    'sales:read',
    'products:read',
    'stock:read',
  ]
  api.defaults.adapter = async (config) => {
    calls.push({
      method: config.method!,
      url: config.url!,
      data: config.data && JSON.parse(config.data),
      params: config.params,
    })
    if (config.method === 'post') {
      await delayPost?.()
      if (fail)
        throw new AxiosError('bad', 'ERR_BAD_REQUEST', config, undefined, {
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config,
          data: { message: 'Saldo insuficiente' },
        })
      return {
        config,
        headers: {},
        status: 201,
        statusText: 'Created',
        data: { data: { id: 'sale-123', totalAmount: '290' } },
      }
    }
    const url = new URL(config.url!, 'http://test')
    let data: unknown = {
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    }
    if (url.pathname === '/sales/lookup' || url.pathname === '/products/p1')
      data = product
    if (url.pathname === '/products' || url.pathname === '/sales/catalog')
      data = {
        items: [product],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }
    if (url.pathname === '/products/categories') data = []
    return {
      config,
      headers: {},
      status: 200,
      statusText: 'OK',
      data: { data },
    }
  }
})
function mountSales() {
  return render(
    <MemoryRouter>
      <SalesWorkspace />
    </MemoryRouter>,
  )
}
async function add() {
  await userEvent.click(await screen.findByRole('button', { name: /Teclado/ }))
}
it('queues barcode scans, preserves leading zeros, merges lines and enforces the stock limit', async () => {
  mountSales()
  const input = screen.getByRole('searchbox', { name: /Buscar produto/ })
  await userEvent.type(input, '00123{Enter}00123{Enter}')
  await waitFor(() =>
    expect(
      (screen.getByLabelText('Quantidade de Teclado') as HTMLInputElement)
        .value,
    ).toBe('2'),
  )
  expect(
    calls
      .filter((call) => call.url === '/sales/lookup')
      .map((call) => call.params),
  ).toEqual([{ code: '00123' }, { code: '00123' }])
  await userEvent.type(input, '00123{Enter}')
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Saldo insuficiente',
  )
  expect(screen.getAllByLabelText('Quantidade de Teclado')).toHaveLength(1)
  expect(
    (screen.getByLabelText('Quantidade de Teclado') as HTMLInputElement).value,
  ).toBe('2')
})
it('uses F2/F4, allows cancellation, sends only items, and displays the server total', async () => {
  mountSales()
  await add()
  fireEvent.keyDown(window, { key: 'F2' })
  expect(document.activeElement).toBe(
    screen.getByRole('searchbox', { name: /Buscar produto/ }),
  )
  fireEvent.keyDown(window, { key: 'F4' })
  await userEvent.click(
    screen.getByRole('button', { name: 'Voltar ao carrinho' }),
  )
  expect(calls.filter((call) => call.method === 'post')).toHaveLength(0)
  await userEvent.click(screen.getByLabelText('Aumentar Teclado'))
  fireEvent.keyDown(window, { key: 'F4' })
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }))
  expect((await screen.findByRole('status')).textContent).toMatch(
    /Total confirmado: R\$\s290,00/,
  )
  expect(calls.find((call) => call.method === 'post')?.data).toEqual({
    items: [{ productId: 'p1', quantity: 2 }],
  })
  expect(screen.queryByLabelText('Quantidade de Teclado')).toBeNull()
})
it('blocks repeated confirmation while saving', async () => {
  let release!: () => void
  delayPost = () =>
    new Promise<void>((resolve) => {
      release = resolve
    })
  mountSales()
  await add()
  fireEvent.keyDown(window, { key: 'F4' })
  const button = screen.getByRole('button', { name: 'Confirmar venda' })
  fireEvent.click(button)
  fireEvent.click(button)
  await waitFor(() =>
    expect(calls.filter((call) => call.method === 'post')).toHaveLength(1),
  )
  release()
  await screen.findByRole('status')
})
it('preserves the cart after server rejection and permits correcting it', async () => {
  fail = true
  mountSales()
  await add()
  fireEvent.keyDown(window, { key: 'F4' })
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }))
  expect((await screen.findByRole('alert')).textContent).toContain(
    'carrinho foi mantido',
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Voltar ao carrinho' }),
  )
  expect(
    (screen.getByLabelText('Quantidade de Teclado') as HTMLInputElement).value,
  ).toBe('1')
})
it('shows only permitted product history and sends date filters to the server', async () => {
  render(
    <MemoryRouter initialEntries={['/products/p1']}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetails />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByText('SKU: TEC-01 · Código de barras: 00123 · Geral')
  expect(screen.queryByRole('button', { name: 'Compras' })).toBeNull()
  expect(calls.some((call) => call.url.includes('/history/purchases'))).toBe(
    false,
  )
  fireEvent.change(screen.getByLabelText('De'), {
    target: { value: '2026-09-01' },
  })
  fireEvent.change(screen.getByLabelText('Até'), {
    target: { value: '2026-09-29' },
  })
  await waitFor(() =>
    expect(
      calls.some((call) => call.url.includes('from=2026-09-01&to=2026-09-29')),
    ).toBe(true),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Vendas' }))
  await waitFor(() =>
    expect(
      calls.some((call) => call.url.includes('/history/sales?page=1')),
    ).toBe(true),
  )
})
it('hides create, edit and deactivate actions for read-only catalog access', async () => {
  access.permissions = ['products:read']
  render(
    <MemoryRouter>
      <Catalog module="products" />
    </MemoryRouter>,
  )
  await screen.findByText('Teclado')
  for (const name of ['Novo cadastro', 'Editar', 'Desativar'])
    expect(screen.queryByRole('button', { name })).toBeNull()
  expect(
    screen.getByRole('link', { name: 'Teclado' }).getAttribute('href'),
  ).toBe('/products/p1')
})
it('hides new sale navigation when the user can only read sales', async () => {
  access.permissions = ['sales:read']
  render(
    <MemoryRouter>
      <Operations module="sales" />
    </MemoryRouter>,
  )
  await screen.findByText('Nenhum registro encontrado')
  expect(screen.queryByRole('link', { name: 'Nova venda' })).toBeNull()
})
