import { beforeEach, expect, it, vi } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AxiosError } from 'axios'
import { api } from '../src/api/http'
import { PurchaseCosting } from '../src/pages/PurchaseCosting'
const access = vi.hoisted(() => ({ write: true }))
vi.mock('../src/hooks/usePermissions', () => ({
  usePermissions: () => (permission: string) =>
    permission !== 'purchases:create' || access.write,
}))
const calculated = {
  currency: 'BRL',
  exchangeRate: '1',
  goodsBRL: '200.00',
  taxesBRL: '20.00',
  expensesBRL: '10.00',
  totalBRL: '230.00',
  charges: [],
  items: [
    {
      purchaseItemId: 'i1',
      productId: 'p1',
      name: 'Teclado',
      sku: 'TEC',
      quantity: 2,
      originalUnitCost: '100',
      goodsBRL: '200',
      allocatedBRL: '30',
      totalBRL: '230',
      unitCostBRL: '115.000000',
      salePriceBRL: '200',
      grossMarginPercent: '42.50',
    },
  ],
}
const calls: { url: string; data: Record<string, unknown> }[] = []
let failSave = false
let estimate: unknown = null
let saveCount = 0
beforeEach(() => {
  access.write = true
  failSave = false
  estimate = null
  saveCount = 0
  calls.length = 0
  api.defaults.adapter = async (config) => {
    const data = config.data && JSON.parse(config.data)
    calls.push({ url: config.url!, data })
    if (config.method === 'post' && !config.url?.endsWith('/preview')) {
      if (failSave)
        throw new AxiosError('conflict', 'ERR_BAD_REQUEST', config, undefined, {
          config,
          status: 409,
          statusText: 'Conflict',
          headers: {},
          data: { message: 'Outra revisão foi salva. Recarregue.' },
        })
      saveCount++
    }
    const response =
      config.method === 'post'
        ? calculated
        : {
            purchase: {
              id: 'purchase1',
              status: 'PENDING',
              supplier: { name: 'Fornecedor' },
              items: [
                {
                  id: 'i1',
                  productId: 'p1',
                  quantity: 2,
                  unitCost: '100',
                  product: { name: 'Teclado', sku: 'TEC' },
                },
              ],
            },
            purchaseFingerprint: 'a'.repeat(64),
            estimate,
            actual: null,
            history: [],
          }
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { data: response },
    }
  }
})
function mount() {
  render(
    <MemoryRouter initialEntries={['/purchases/purchase1/costing']}>
      <Routes>
        <Route path="/purchases/:id/costing" element={<PurchaseCosting />} />
      </Routes>
    </MemoryRouter>,
  )
}
async function calculate() {
  await userEvent.click(screen.getByRole('button', { name: 'Calcular custos' }))
  await screen.findByText('Resultado do cálculo')
}
it('adds a charge, previews server totals, then saves only after confirmation', async () => {
  mount()
  await screen.findByLabelText('Custo de Teclado')
  await userEvent.click(
    screen.getByRole('button', { name: 'Adicionar encargo' }),
  )
  await userEvent.type(screen.getByLabelText('Descrição do encargo 1'), 'Frete')
  await userEvent.clear(screen.getByLabelText('Valor em R$ 1'))
  await userEvent.type(screen.getByLabelText('Valor em R$ 1'), '10.25')
  await calculate()
  expect(
    calls.find((call) => call.url.endsWith('/preview'))?.data.charges,
  ).toEqual([
    {
      label: 'Frete',
      kind: 'EXPENSE',
      mode: 'FIXED',
      amount: '10.25',
      rate: '0',
      base: '0',
      grossUp: false,
    },
  ])
  await userEvent.click(
    screen.getByRole('button', { name: /Salvar nova revisão/ }),
  )
  expect(saveCount).toBe(0)
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar salvamento' }),
  )
  await screen.findByText(/Nova revisão salva/)
  expect(saveCount).toBe(1)
})
it('distinguishes parcel imports, sends manual FX and invalidates preview after edits', async () => {
  mount()
  await screen.findByLabelText('Custo de Teclado')
  await userEvent.selectOptions(
    screen.getByLabelText('Tipo de operação'),
    'INTERNATIONAL_PARCEL',
  )
  await userEvent.selectOptions(
    screen.getByLabelText('Moeda dos produtos'),
    'USD',
  )
  const fx = screen.getByLabelText(/Câmbio/)
  await userEvent.clear(fx)
  await userEvent.type(fx, '5.25')
  await calculate()
  expect(
    calls.find((call) => call.url.endsWith('/preview'))?.data,
  ).toMatchObject({
    currency: 'USD',
    exchangeRate: '5.25',
    operation: 'INTERNATIONAL_PARCEL',
  })
  fireEvent.change(screen.getByLabelText('Custo de Teclado'), {
    target: { value: '30' },
  })
  expect(
    screen.queryByRole('button', { name: /Salvar nova revisão/ }),
  ).toBeNull()
})
it('supports explicit percent bases and gross-up without automatic rates', async () => {
  mount()
  await screen.findByLabelText('Custo de Teclado')
  await userEvent.click(
    screen.getByRole('button', { name: 'Adicionar encargo' }),
  )
  await userEvent.type(
    screen.getByLabelText('Descrição do encargo 1'),
    'ICMS informado',
  )
  await userEvent.selectOptions(screen.getByLabelText('Categoria 1'), 'TAX')
  await userEvent.selectOptions(screen.getByLabelText('Cálculo 1'), 'PERCENT')
  fireEvent.change(screen.getByLabelText('Base em R$ 1'), {
    target: { value: '100' },
  })
  fireEvent.change(screen.getByLabelText('Percentual (%) 1'), {
    target: { value: '20' },
  })
  await userEvent.selectOptions(
    screen.getByLabelText('Forma de cálculo 1'),
    'true',
  )
  await calculate()
  expect(
    calls.find((call) => call.url.endsWith('/preview'))?.data.charges,
  ).toEqual([
    expect.objectContaining({
      kind: 'TAX',
      base: '100',
      rate: '20',
      grossUp: true,
    }),
  ])
})
it('requires a document reference for actual costs', async () => {
  mount()
  await screen.findByLabelText('Custo de Teclado')
  await userEvent.click(
    screen.getByRole('button', { name: 'Realizado', exact: true }),
  )
  const reference = screen.getByLabelText(
    'Referência dos documentos *',
  ) as HTMLInputElement
  expect(reference.required).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Calcular custos' }))
  expect(calls.some((call) => call.url.endsWith('/preview'))).toBe(false)
  await userEvent.type(reference, 'Invoice 2026-001')
  await calculate()
  expect(calls.find((call) => call.url.endsWith('/preview'))?.data.stage).toBe(
    'ACTUAL',
  )
})
it('permits read-only simulation and hides save actions', async () => {
  access.write = false
  mount()
  await screen.findByLabelText('Custo de Teclado')
  await calculate()
  expect(
    screen.queryByRole('button', { name: /Salvar nova revisão/ }),
  ).toBeNull()
})
it('preserves the form and shows revision conflicts', async () => {
  failSave = true
  mount()
  await screen.findByLabelText('Custo de Teclado')
  await calculate()
  await userEvent.click(
    screen.getByRole('button', { name: /Salvar nova revisão/ }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar salvamento' }),
  )
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Outra revisão',
  )
  expect(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Voltar' }),
  ).toBeTruthy()
  expect(
    (screen.getByLabelText('Custo de Teclado') as HTMLInputElement).value,
  ).toBe('100')
})
it('warns about stale snapshots and requires confirmation to discard edits', async () => {
  estimate = {
    id: 'old',
    revision: 1,
    input: {
      purchaseFingerprint: 'old',
      operation: 'DOMESTIC',
      reference: '',
      notes: '',
    },
    output: calculated,
  }
  mount()
  await screen.findByText(/Os itens da compra mudaram/)
  fireEvent.change(screen.getByLabelText('Custo de Teclado'), {
    target: { value: '30' },
  })
  expect(
    (
      screen.getByRole('button', {
        name: 'Realizado',
        exact: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  await userEvent.click(
    screen.getByRole('button', { name: 'Descartar edições' }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Continuar editando' }),
  )
  expect(
    (screen.getByLabelText('Custo de Teclado') as HTMLInputElement).value,
  ).toBe('30')
  await userEvent.click(
    screen.getByRole('button', { name: 'Descartar edições' }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar descarte' }),
  )
  expect(
    (screen.getByLabelText('Custo de Teclado') as HTMLInputElement).value,
  ).toBe('100')
})
