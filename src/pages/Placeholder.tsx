import { Construction } from 'lucide-react'

type PlaceholderProps = {
  title: string
}

export function Placeholder({
  title,
}: PlaceholderProps) {
  return (
    <div>
      <p className="text-sm font-medium text-indigo-600">
        MiniERP
      </p>

      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>

      <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Construction size={26} />
        </div>

        <p className="mt-5 font-semibold text-slate-700">
          Módulo em construção
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Essa será uma das próximas telas.
        </p>
      </div>
    </div>
  )
}