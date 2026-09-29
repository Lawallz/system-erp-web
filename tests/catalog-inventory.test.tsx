import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { api } from '../src/api/http'
import { Catalog } from '../src/pages/Catalog'
import { Inventory } from '../src/pages/Inventory'
import { csvCell } from '../src/api/csv'
const product = {
  id: 'p1',
  name: 'Teclado',
  sku: 'TEC-01',
  price: '150.00',
  costPrice: '80',
  description: 'Descrição antiga',
  stockQuantity: 5,
  minStockAlert: 20,
  categoryId: 'c1',
  category: { name: 'Periféricos' },
  isActive: true,
}
let responses: Record<string, unknown>
let failStatus: boolean
const calls: {
  method: string
  url: string
  data: Record<string, unknown> | undefined
}[] = []
beforeEach(() => {
  calls.length = 0
  failStatus = false
  responses = {
    '/products': [product],
    '/products/categories': [{ id: 'c1', name: 'Periféricos' }],
    '/products?status=inactive': [{ ...product, isActive: false }],
    '/users': { data: [{ id: 'u1', name: 'Maria', isActive: true }] },
    '/suppliers': { data: [{ id: 's1', name: 'Fornecedor', isActive: false }] },
  }
  api.defaults.adapter = async (config) => {
    calls.push({
      method: config.method!,
      url: config.url!,
      data: config.data ? JSON.parse(config.data) : undefined,
    })
    if (failStatus && config.method === 'patch')
      throw new AxiosError('forbidden', 'ERR_BAD_REQUEST', config, undefined, {
        data: {},
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      })
    return {
      data: responses[config.url!] ?? { data: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
})
describe('catalog lifecycle', () => {
  it('edits prices and clears description without sending stock or status', async () => {
    render(<Catalog module="products" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialog = within(screen.getByRole('dialog'))
    await dialog.findByRole('option', { name: 'Periféricos' })
    await userEvent.clear(dialog.getByLabelText('Preço de venda (R$)'))
    await userEvent.type(dialog.getByLabelText('Preço de venda (R$)'), '175.50')
    await userEvent.clear(dialog.getByLabelText(/Descrição/))
    await userEvent.click(
      dialog.getByRole('button', { name: 'Salvar cadastro' }),
    )
    await screen.findByText('Cadastro salvo com sucesso.')
    const saved = calls.find((call) => call.method === 'put')!
    expect(saved.url).toBe('/products/p1')
    expect(saved.data).toMatchObject({
      price: 175.5,
      description: '',
      minStockAlert: 20,
      categoryId: 'c1',
    })
    expect(saved.data).not.toHaveProperty('stockQuantity')
    expect(saved.data).not.toHaveProperty('isActive')
  })
  it('requires confirmation and can cancel deactivation', async () => {
    render(<Catalog module="products" />)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desativar' }),
    )
    expect(calls.some((call) => call.method === 'patch')).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(calls.some((call) => call.method === 'patch')).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar desativação' }),
    )
    await screen.findByText('Status atualizado com sucesso.')
    expect(
      calls.some(
        (call) =>
          call.url === '/products/p1/deactivate' && call.method === 'patch',
      ),
    ).toBe(true)
  })
  it('loads inactive products and reactivates through the right endpoint', async () => {
    render(<Catalog module="products" />)
    await screen.findByText('Teclado')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'inactive')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reativar' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar reativação' }),
    )
    await waitFor(() =>
      expect(calls.some((call) => call.url === '/products/p1/activate')).toBe(
        true,
      ),
    )
  })
  it.each([
    ['users', 'Desativar', '/users/u1/deactivate'],
    ['suppliers', 'Reativar', '/suppliers/s1/activate'],
  ])('supports status changes for %s', async (module, action, path) => {
    render(<Catalog module={module} />)
    await userEvent.click(await screen.findByRole('button', { name: action }))
    await userEvent.click(screen.getByRole('button', { name: /Confirmar/ }))
    await waitFor(() =>
      expect(
        calls.some((call) => call.url === path && call.method === 'patch'),
      ).toBe(true),
    )
  })
  it('keeps the dialog open and displays permission failure', async () => {
    failStatus = true
    render(<Catalog module="products" />)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desativar' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar desativação' }),
    )
    expect((await screen.findByRole('alert')).textContent).toContain(
      'permissão',
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByText('Status atualizado com sucesso.')).toBeNull()
  })
  it('combines category and out-of-stock filters', async () => {
    responses['/products'] = [
      product,
      {
        ...product,
        id: 'p2',
        name: 'Mouse',
        stockQuantity: 0,
        category: { name: 'Acessórios' },
      },
    ]
    render(<Catalog module="products" />)
    await screen.findByText('Mouse')
    await userEvent.selectOptions(screen.getByLabelText('Saldo'), 'out')
    expect(screen.queryByText('Teclado')).toBeNull()
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por categoria'),
      'Periféricos',
    )
    expect(screen.queryByText('Mouse')).toBeNull()
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar filtros' }),
    )
    expect(screen.getByText('Teclado')).toBeTruthy()
  })
})
describe('replenishment plan', () => {
  beforeEach(() => {
    const row = {
      ...product,
      category: 'Periféricos',
      pendingQuantity: 8,
      projectedQuantity: 13,
      suggestedQuantity: 7,
      estimatedCost: '560.00',
      stockCost: '400.00',
      stockRetail: '750.00',
      grossMarginPercent: 46.67,
      status: 'LOW',
    }
    responses['/reports/inventory'] = {
      data: {
        summary: {
          activeProducts: 2,
          totalUnits: 5,
          lowStockCount: 2,
          productsToReorder: 1,
          costValue: '400.00',
          retailValue: '750.00',
          estimatedReorderCost: '560.00',
        },
        products: [
          row,
          {
            ...row,
            id: 'p2',
            name: 'Mouse',
            stockQuantity: 0,
            minStockAlert: 0,
            suggestedQuantity: 0,
            pendingQuantity: 0,
            estimatedCost: '0.00',
            stockCost: '0.00',
            status: 'OUT_OF_STOCK',
          },
        ],
      },
    }
  })
  it('shows reorder candidates first and permits browsing zero-stock items', async () => {
    render(
      <MemoryRouter>
        <Inventory />
      </MemoryRouter>,
    )
    await screen.findByText('Teclado')
    expect(screen.queryByText('Mouse')).toBeNull()
    expect(screen.getByText('7 un.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Sem estoque' }))
    expect(screen.getByText('Mouse')).toBeTruthy()
    expect(screen.queryByText('Teclado')).toBeNull()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Buscar no plano' }),
      'não existe',
    )
    expect(screen.getByText('Nenhum produto neste filtro')).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Exportar plano',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
  it('exports only the selected subset with the displayed search', async () => {
    const create = vi.fn((_blob: Blob) => 'blob:plan')
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: create,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    render(
      <MemoryRouter>
        <Inventory />
      </MemoryRouter>,
    )
    await screen.findByText('Teclado')
    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar plano' }),
    )
    expect(create).toHaveBeenCalledTimes(1)
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(create.mock.calls[0][0])
    })
    expect(text).toContain('Teclado')
    expect(text).not.toContain('Mouse')
    expect(text).toContain('Quantidade sugerida')
    click.mockRestore()
  })
  it.each(['=SUM(A1)', '  =SUM(A1)', '+cmd', '@SUM(A1)', '\tformula'])(
    'protects formula-like CSV values: %s',
    (value) => {
      expect(csvCell(value)).toBe('"\'' + value + '"')
    },
  )
})
