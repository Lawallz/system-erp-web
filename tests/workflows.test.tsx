import { pagedFixture } from './paged-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../src/api/http'
import { Catalog } from '../src/pages/Catalog'
import { Operations } from '../src/pages/Operations'
import { Reports } from '../src/pages/Reports'
import { Dashboard } from '../src/pages/Dashboard'
import { AuthProvider } from '../src/contexts/AuthContext'
import { AppLayout } from '../src/layouts/AppLayout'
import { Login } from '../src/pages/Login'
const product = {
  id: 'p1',
  name: 'Teclado',
  sku: 'TEC-01',
  price: '150.00',
  costPrice: '80',
  stockQuantity: 10,
  minStockAlert: 2,
  categoryId: 'c1',
  category: { name: 'Periféricos' },
  isActive: true,
}
const calls: { method: string; url: string; data: Record<string, unknown> }[] =
  []
let responses: Record<string, unknown>
beforeEach(() => {
  calls.length = 0
  responses = {
    '/auth/me': {
      data: {
        id: 'u1',
        name: 'Pedro',
        role: 'Admin',
        permissions: ['products:read'],
      },
    },
    '/products': [product],
    '/products/categories': [{ id: 'c1', name: 'Periféricos' }],
    '/categories': { data: [{ id: 'c1', name: 'Periféricos' }] },
    '/sales': { data: [] },
    '/stock/movements': { data: [] },
    '/purchases': { data: [] },
    '/roles/permissions': {
      data: [
        { id: 'perm1', name: 'products:read' },
        { id: 'perm2', name: 'products:create' },
      ],
    },
    '/roles': { data: [{ id: 'r1', name: 'Operador' }] },
    '/roles/r1': {
      data: {
        id: 'r1',
        name: 'Operador',
        rolePermissions: [{ permissionId: 'perm1' }],
      },
    },
  }
  api.defaults.adapter = async (config) => {
    const body = config.data ? JSON.parse(config.data) : undefined
    calls.push({ method: config.method!, url: config.url!, data: body })
    return {
      data: pagedFixture(config.url!, responses),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
})
describe('ERP interface contracts', () => {
  it('shows products and searches through the paginated API', async () => {
    render(
      <MemoryRouter>
        <Catalog module="products" />
      </MemoryRouter>,
    )
    await screen.findByText('Teclado')
    expect(screen.getByText('R$ 150,00')).toBeTruthy()
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar registros' }),
      'inexistente',
    )
    expect(await screen.findByText('Nenhum registro encontrado')).toBeTruthy()
  })
  it('creates products with numeric prices and category id', async () => {
    render(
      <MemoryRouter>
        <Catalog module="products" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Novo cadastro' }))
    await within(screen.getByRole('dialog')).findByRole('option', {
      name: 'Periféricos',
    })
    await userEvent.type(screen.getByLabelText('SKU / código'), 'MOU-01')
    await userEvent.type(screen.getByLabelText('Nome'), 'Mouse')
    await userEvent.type(screen.getByLabelText('Preço de venda (R$)'), '99.90')
    await userEvent.type(screen.getByLabelText('Preço de custo (R$)'), '50')
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'c1')
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar cadastro' }),
    )
    await screen.findByText('Cadastro salvo com sucesso.')
    expect(calls.find((call) => call.method === 'post')?.data).toEqual({
      sku: 'MOU-01',
      name: 'Mouse',
      price: 99.9,
      costPrice: 50,
      minStockAlert: 0,
      categoryId: 'c1',
    })
  })
  it('edits categories using PUT and the wrapped response', async () => {
    render(
      <MemoryRouter>
        <Catalog module="categories" />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    await userEvent.clear(screen.getByLabelText('Nome'))
    await userEvent.type(screen.getByLabelText('Nome'), 'Acessórios')
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar cadastro' }),
    )
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'put' &&
            call.url === '/categories/c1' &&
            call.data.name === 'Acessórios',
        ),
      ).toBe(true),
    )
  })
  it('preserves existing rolePermissions and submits selected ids', async () => {
    render(
      <MemoryRouter>
        <Catalog module="roles" />
      </MemoryRouter>,
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Permissões' }),
    )
    const read = await screen.findByRole('checkbox', { name: 'products:read' })
    expect((read as HTMLInputElement).checked).toBe(true)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'products:create' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar permissões' }),
    )
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'put')?.data).toEqual({
        permissionIds: ['perm1', 'perm2'],
      }),
    )
  })
  it('does not request purchase details when opening a sale', async () => {
    responses['/sales'] = {
      data: [
        {
          id: 'sale1',
          totalAmount: '150',
          createdAt: '2026-09-28T12:00:00Z',
          user: { name: 'Pedro' },
          items: [
            {
              id: 'i1',
              product: { name: 'Teclado' },
              quantity: 1,
              subtotal: '150',
            },
          ],
        },
      ],
    }
    render(
      <MemoryRouter>
        <Operations module="sales" />
      </MemoryRouter>,
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver detalhes' }),
    )
    expect(await screen.findByText('Teclado')).toBeTruthy()
    expect(calls.some((call) => call.url.startsWith('/purchases'))).toBe(false)
  })
  it('requires confirmation before receiving a purchase', async () => {
    const purchase = {
      id: 'order1',
      status: 'PENDING',
      totalAmount: '80',
      createdAt: '2026-09-28T12:00:00Z',
      supplier: { name: 'Parceiro' },
      items: [
        { id: 'i1', product: { name: 'Teclado' }, quantity: 1, subtotal: '80' },
      ],
    }
    responses['/purchases'] = { data: [purchase] }
    responses['/purchases/order1'] = { data: purchase }
    render(
      <MemoryRouter>
        <Operations module="purchases" />
      </MemoryRouter>,
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver detalhes' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Receber compra' }),
    )
    expect(calls.some((call) => call.method === 'patch')).toBe(false)
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar recebimento' }),
    )
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'patch' && call.url === '/purchases/order1/receive',
        ),
      ).toBe(true),
    )
  })
  it('renders all four report shapes', async () => {
    responses['/reports/sales'] = {
      data: {
        totalRevenue: 150,
        topProducts: [{ ...product, revenue: 150, quantity: 1 }],
      },
    }
    responses['/reports/stock'] = {
      data: { totalQuantity: 10, lowStockProducts: [product] },
    }
    responses['/reports/products'] = {
      data: { activeProducts: 1, productsWithoutMovement: [product] },
    }
    responses['/reports/abc'] = {
      data: {
        totalRevenue: 150,
        products: [
          {
            ...product,
            revenue: 150,
            percentage: 100,
            accumulatedPercentage: 100,
            classification: 'C',
          },
        ],
      },
    }
    render(<Reports />)
    await screen.findByText('Teclado')
    for (const name of ['Estoque', 'Produtos', 'Curva ABC']) {
      await userEvent.click(screen.getByRole('button', { name, exact: true }))
      await screen.findByText('Teclado')
    }
    expect(screen.getByText('C')).toBeTruthy()
  })
  it('renders dashboard with real response fields and empty states', async () => {
    responses['/dashboard'] = {
      data: {
        summary: {
          totalProducts: 1,
          totalRevenue: 0,
          totalSales: 0,
          averageTicket: 0,
          lowStockCount: 0,
          pendingPurchases: 0,
        },
        topProducts: [],
        lowStockProducts: [],
        recentSales: [],
      },
    }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
    expect(
      await screen.findByText('Seu próximo resultado começa aqui'),
    ).toBeTruthy()
  })
  it('opens and closes mobile navigation and handles session expiry', async () => {
    localStorage.setItem('erp_token', 'test-token')
    localStorage.setItem(
      'erp_user',
      JSON.stringify({ name: 'Pedro', role: 'Admin' }),
    )
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </MemoryRouter>,
    )
    await screen.findByText('Pedro')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(
      screen
        .getByRole('button', { name: 'Fechar menu' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    await userEvent.click(screen.getByRole('link', { name: 'Produtos' }))
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeTruthy()
    fireEvent(window, new Event('erp:session-expired'))
    expect(screen.queryByText('Pedro')).toBeNull()
  })
  it('starts login without default credentials', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('')
  })
  it('paginates and clamps the page after filtering', async () => {
    responses['/categories'] = {
      data: Array.from({ length: 13 }, (_, index) => ({
        id: String(index),
        name: `Categoria ${index}`,
      })),
    }
    render(
      <MemoryRouter>
        <Catalog module="categories" />
      </MemoryRouter>,
    )
    await screen.findByText('Categoria 0')
    await userEvent.selectOptions(screen.getByLabelText('Por página'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(await screen.findByText('Categoria 12')).toBeTruthy()
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar registros' }),
      'Categoria 0',
    )
    expect(await screen.findByText('Categoria 0')).toBeTruthy()
    expect(screen.getByText(/Página 1 de 1/)).toBeTruthy()
  })
})

vi.mock('../src/hooks/usePermissions', () => ({
  usePermissions: () => () => true,
}))
