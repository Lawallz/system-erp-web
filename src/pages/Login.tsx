import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  LockKeyhole,
  Mail,
  PackageCheck,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

export function Login() {
  const navigate = useNavigate()

  const { login, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await login({
        email,
        password,
      })

      navigate('/')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ?? 'Não foi possível realizar o login.',
        )
      } else {
        setError('Não foi possível realizar o login.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-lime-500/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Boxes size={24} />
            </div>

            <div>
              <p className="text-xl font-bold text-white">MiniERP</p>

              <p className="text-xs text-slate-400">Gestão inteligente</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <span className="mb-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Sistema de gestão empresarial
          </span>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white">
            Controle sua operação em um único lugar.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
            Estoque, vendas, compras, fornecedores e indicadores integrados em
            uma única plataforma.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <Feature
              icon={<ChartNoAxesCombined size={20} />}
              title="Indicadores"
              text="Visão gerencial"
            />

            <Feature
              icon={<PackageCheck size={20} />}
              title="Estoque"
              text="Controle preciso"
            />

            <Feature
              icon={<Boxes size={20} />}
              title="Operação"
              text="Tudo integrado"
            />
          </div>
        </div>

        <p className="relative text-sm text-slate-600">
          MiniERP • Gestão que conecta.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Boxes size={24} />
              </div>

              <p className="text-xl font-bold text-slate-900">MiniERP</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-emerald-600">Bem-vindo</p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Entre na sua conta
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Utilize suas credenciais para acessar o painel administrativo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                E-mail
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Senha
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Ambiente administrativo protegido
          </p>
        </div>
      </section>
    </main>
  )
}

type FeatureProps = {
  icon: ReactNode
  title: string
  text: string
}

function Feature({ icon, title, text }: FeatureProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 text-emerald-300">{icon}</div>

      <p className="font-medium text-white">{title}</p>

      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  )
}
