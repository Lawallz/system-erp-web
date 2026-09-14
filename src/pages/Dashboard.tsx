import type { ReactNode } from 'react'

import {
  AlertTriangle,
  Banknote,
  Package,
  ReceiptText,
  ShoppingBag,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import { api } from '../api/http'

type TopProduct = {
  productId: string
  sku: string
  name: string
  quantity: number
  revenue: number
}

type LowStockProduct = {
  id: string
  sku: string
  name: string
  stockQuantity: number
  minStockAlert: number
}

type DashboardData = {
  summary: {
    totalProducts: number
    lowStockCount: number
    totalSales: number
    totalRevenue: number
    averageTicket: number
    pendingPurchases: number
  }

  topProducts: TopProduct[]

  lowStockProducts: LowStockProduct[]
}

type DashboardResponse = {
  status: string
  data: DashboardData
}

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function Dashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response =
          await api.get<DashboardResponse>('/dashboard')

        setDashboard(response.data.data)
      } catch {
        setError(
          'Não foi possível carregar os dados do dashboard.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error || 'Dashboard indisponível.'}
      </div>
    )
  }

  const { summary } = dashboard

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-indigo-600">
          Visão geral
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Acompanhe os principais indicadores da operação.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card
          label="Receita"
          value={currency(summary.totalRevenue)}
          icon={<Banknote size={21} />}
        />

        <Card
          label="Vendas"
          value={summary.totalSales.toString()}
          icon={<ShoppingBag size={21} />}
        />

        <Card
          label="Ticket médio"
          value={currency(summary.averageTicket)}
          icon={<ReceiptText size={21} />}
        />

        <Card
          label="Produtos"
          value={summary.totalProducts.toString()}
          icon={<Package size={21} />}
        />

        <Card
          label="Estoque baixo"
          value={summary.lowStockCount.toString()}
          icon={<AlertTriangle size={21} />}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              Produtos mais vendidos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ranking por faturamento
            </p>
          </div>

          <div>
            {dashboard.topProducts.length === 0 ? (
              <EmptyState text="Nenhuma venda registrada." />
            ) : (
              dashboard.topProducts.map(
                (product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                        {index + 1}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {product.sku} • {product.quantity}{' '}
                          unidades
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-slate-900">
                      {currency(product.revenue)}
                    </p>
                  </div>
                ),
              )
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={18}
                className="text-amber-500"
              />

              <h2 className="font-semibold text-slate-900">
                Estoque baixo
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Produtos que precisam de atenção
            </p>
          </div>

          <div>
            {dashboard.lowStockProducts.length === 0 ? (
              <EmptyState text="Nenhum produto com estoque baixo." />
            ) : (
              dashboard.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {product.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {product.sku}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">
                      {product.stockQuantity}
                    </p>

                    <p className="text-xs text-slate-400">
                      mínimo {product.minStockAlert}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Compras pendentes
        </p>

        <p className="mt-1 text-3xl font-bold text-slate-900">
          {summary.pendingPurchases}
        </p>
      </section>
    </div>
  )
}

type CardProps = {
  label: string
  value: string
  icon: ReactNode
}

function Card({
  label,
  value,
  icon,
}: CardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  )
}

function EmptyState({
  text,
}: {
  text: string
}) {
  return (
    <div className="px-6 py-12 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}