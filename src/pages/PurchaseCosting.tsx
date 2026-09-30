import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Trash2, Calculator, Save, Download } from 'lucide-react'
import { api } from '../api/http'
import { date, errorMessage, money, unwrap } from '../api/data'
import { downloadCsv } from '../api/csv'
import { Feedback, Modal, PageTitle } from '../components/UI'
import { useResource } from '../hooks/useResource'
import { usePermissions } from '../hooks/usePermissions'
type Stage = 'ESTIMATE' | 'ACTUAL'
type Charge = {
  label: string
  kind: 'TAX' | 'EXPENSE'
  mode: 'FIXED' | 'PERCENT'
  amount: string
  rate: string
  base: string
  grossUp: boolean
}
type Input = {
  stage: Stage
  operation: string
  currency: string
  exchangeRate: string
  reference: string
  notes: string
  expectedRevision: number
  purchaseFingerprint: string
  items: { purchaseItemId: string; unitCost: string }[]
  charges: Charge[]
}
type ResultItem = {
  purchaseItemId: string
  productId: string
  name: string
  sku: string
  quantity: number
  originalUnitCost: string
  goodsBRL: string
  allocatedBRL: string
  totalBRL: string
  unitCostBRL: string
  salePriceBRL: string
  grossMarginPercent: string | null
}
type Result = {
  currency: string
  exchangeRate: string
  goodsBRL: string
  taxesBRL: string
  expensesBRL: string
  totalBRL: string
  items: ResultItem[]
  charges: (Charge & { amountBRL: string })[]
}
type Sheet = {
  id: string
  stage: Stage
  revision: number
  reference: string
  createdAt: string
  input: Input
  output: Result
}
type Source = {
  purchase: {
    id: string
    status: string
    supplier: { name: string }
    items: {
      id: string
      productId: string
      quantity: number
      unitCost: string
      product: { name: string; sku: string }
    }[]
  }
  purchaseFingerprint: string
  estimate: Sheet | null
  actual: Sheet | null
  history: Omit<Sheet, 'input' | 'output'>[]
}
const stageName = (stage: Stage) =>
  stage === 'ESTIMATE' ? 'Estimado' : 'Realizado'
export function PurchaseCosting() {
  const { id } = useParams()
  const resource = useResource<Source>(`/purchases/${id}/costing`)
  const [stage, setStage] = useState<Stage>('ESTIMATE')
  const [dirty, setDirty] = useState(false)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const data = resource.data
  return (
    <>
      <PageTitle
        title="Custos, taxas e importação"
        description={`Compra #${id?.slice(0, 8)} · ${data?.purchase.supplier.name || 'Carregando fornecedor'}`}
        action={
          <Link className="btn" to="/purchases">
            Voltar às compras
          </Link>
        }
      />
      <p className="notice">
        Controle gerencial: informe valores e bases conferidos nos documentos.
        Não calcula automaticamente regras fiscais, créditos tributários ou
        tributos por NCM. Não emite notas fiscais.
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <Feedback {...resource} retry={resource.reload} />
      {data && !resource.loading && !resource.error && (
        <>
          <div className="metrics costing-metrics">
            <div className="metric">
              <span>Última estimativa salva</span>
              <strong>
                {data.estimate ? money(data.estimate.output.totalBRL) : '—'}
              </strong>
              <small>
                {data.estimate
                  ? `Revisão ${data.estimate.revision}`
                  : 'Sem estimativa'}
              </small>
            </div>
            <div className="metric">
              <span>Último realizado informado</span>
              <strong>
                {data.actual ? money(data.actual.output.totalBRL) : '—'}
              </strong>
              <small>
                {data.actual
                  ? `Revisão ${data.actual.revision}`
                  : 'Sem custos realizados'}
              </small>
            </div>
            <div className="metric">
              <span>Realizado − estimado</span>
              <strong>
                {data.actual &&
                data.estimate &&
                data.actual.input.purchaseFingerprint ===
                  data.estimate.input.purchaseFingerprint
                  ? money(
                      Number(data.actual.output.totalBRL) -
                        Number(data.estimate.output.totalBRL),
                    )
                  : '—'}
              </strong>
              <small>Comparação das versões salvas com os mesmos itens</small>
            </div>
          </div>
          {[data.estimate, data.actual].some(
            (sheet) =>
              sheet &&
              sheet.input.purchaseFingerprint !== data.purchaseFingerprint,
          ) && (
            <p className="notice error">
              Os itens da compra mudaram desde um cálculo salvo. Revise os
              valores e salve uma nova versão. Versões antigas continuam
              disponíveis no histórico.
            </p>
          )}
          <div className="tabs" aria-label="Etapa dos custos">
            {(['ESTIMATE', 'ACTUAL'] as const).map((value) => (
              <button
                key={value}
                disabled={dirty && value !== stage}
                aria-pressed={stage === value}
                className={stage === value ? 'selected' : ''}
                onClick={() => {
                  setStage(value)
                  setNotice('')
                }}
              >
                {stageName(value)}
              </button>
            ))}
          </div>
          {data.purchase.items.length ? (
            <CostingEditor
              key={`${stage}:${data.estimate?.id}:${data.actual?.id}:${data.purchaseFingerprint}`}
              source={data}
              stage={stage}
              dirtyChanged={setDirty}
              saved={() => {
                setDirty(false)
                setNotice(
                  'Nova revisão salva. Estoque, preços e custo cadastrado permanecem sob controle dos seus fluxos próprios.',
                )
                resource.reload()
              }}
            />
          ) : (
            <div className="panel empty">
              <h2>Adicione itens à compra primeiro</h2>
              <p>
                Os custos serão distribuídos entre os produtos desse pedido.
              </p>
            </div>
          )}
          <section className="panel costing-section">
            <h2>Histórico de revisões</h2>
            <p className="muted">
              Últimas 20 revisões. Cada salvamento preserva os cálculos
              anteriores.
            </p>
            {data.history.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Etapa</th>
                      <th>Revisão</th>
                      <th>Data</th>
                      <th>Referência</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((sheet) => (
                      <tr key={sheet.id}>
                        <td>{stageName(sheet.stage)}</td>
                        <td>{sheet.revision}</td>
                        <td>{date(sheet.createdAt)}</td>
                        <td>{sheet.reference || '—'}</td>
                        <td>
                          <button
                            className="btn small"
                            onClick={() => setHistoryId(sheet.id)}
                          >
                            Consultar revisão {sheet.revision} ·{' '}
                            {stageName(sheet.stage)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma revisão salva.</p>
            )}
          </section>
        </>
      )}
      {historyId && (
        <History
          purchaseId={id!}
          id={historyId}
          close={() => setHistoryId(null)}
        />
      )}
    </>
  )
}
function CostingEditor({
  source,
  stage,
  saved,
  dirtyChanged,
}: {
  source: Source
  stage: Stage
  saved: () => void
  dirtyChanged: (dirty: boolean) => void
}) {
  const can = usePermissions()
  const latest = stage === 'ESTIMATE' ? source.estimate : source.actual
  const seed = latest || (stage === 'ACTUAL' ? source.estimate : null)
  function initial(): Input {
    const compatible =
      seed?.input.purchaseFingerprint === source.purchaseFingerprint
    return {
      stage,
      operation: seed?.input.operation || 'DOMESTIC',
      currency: compatible ? seed!.input.currency : 'BRL',
      exchangeRate: compatible ? seed!.input.exchangeRate : '1',
      reference: latest?.input.reference || '',
      notes: latest?.input.notes || '',
      expectedRevision: latest?.revision || 0,
      purchaseFingerprint: source.purchaseFingerprint,
      items: source.purchase.items.map((item) => ({
        purchaseItemId: item.id,
        unitCost: compatible
          ? seed!.input.items.find((row) => row.purchaseItemId === item.id)
              ?.unitCost || item.unitCost
          : item.unitCost,
      })),
      charges: compatible ? seed!.input.charges : [],
    }
  }
  const [input, setInput] = useState<Input>(initial)
  const [result, setResult] = useState<Result | null>(
    latest?.input.purchaseFingerprint === source.purchaseFingerprint
      ? latest.output
      : null,
  )
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [reset, setReset] = useState(false)
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  function change(next: Input) {
    setInput(next)
    setResult(null)
    setDirty(true)
    dirtyChanged(true)
    setError('')
  }
  function chargeChange(index: number, patch: Partial<Charge>) {
    change({
      ...input,
      charges: input.charges.map((charge, i) =>
        i === index ? { ...charge, ...patch } : charge,
      ),
    })
  }
  async function preview(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const response = await api.post(
        `/purchases/${source.purchase.id}/costing/preview`,
        input,
      )
      setResult(unwrap<Result>(response.data))
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function save() {
    if (lock.current || !result || !can('purchases:create')) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await api.post(`/purchases/${source.purchase.id}/costing`, input)
      setConfirm(false)
      saved()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <form onSubmit={preview} className="panel costing-section">
        <fieldset disabled={busy} className="costing-fieldset">
          <h2>{stageName(stage)} · dados do cálculo</h2>
          {stage === 'ACTUAL' && !latest && seed && (
            <p className="notice">
              Dados copiados da estimativa. Substitua pelos valores realizados e
              informe a referência dos documentos.
            </p>
          )}
          <div className="form-grid">
            <label>
              Tipo de operação
              <select
                value={input.operation}
                onChange={(event) =>
                  change({
                    ...input,
                    operation: event.target.value,
                    ...(event.target.value === 'DOMESTIC'
                      ? { currency: 'BRL', exchangeRate: '1' }
                      : {}),
                  })
                }
              >
                <option value="DOMESTIC">Compra nacional</option>
                <option value="COMMERCIAL_IMPORT">
                  Importação para revenda
                </option>
                <option value="INTERNATIONAL_PARCEL">
                  Encomenda internacional
                </option>
              </select>
            </label>
            <label>
              Moeda dos produtos
              <select
                value={input.currency}
                disabled={input.operation === 'DOMESTIC'}
                onChange={(event) =>
                  change({
                    ...input,
                    currency: event.target.value,
                    exchangeRate:
                      event.target.value === 'BRL' ? '1' : input.exchangeRate,
                  })
                }
              >
                {[
                  'BRL',
                  'USD',
                  'EUR',
                  'CNY',
                  'GBP',
                  'JPY',
                  'ARS',
                  'CAD',
                  'CHF',
                  'AUD',
                ].map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </label>
            <label>
              Câmbio · R$ por 1 {input.currency}
              <input
                type="number"
                min="0.000001"
                max="100000"
                step="0.000001"
                required
                disabled={input.currency === 'BRL'}
                value={input.exchangeRate}
                onChange={(event) =>
                  change({ ...input, exchangeRate: event.target.value })
                }
              />
            </label>
            <label>
              Referência dos documentos{stage === 'ACTUAL' ? ' *' : ''}
              <input
                required={stage === 'ACTUAL'}
                maxLength={200}
                value={input.reference}
                onChange={(event) =>
                  change({ ...input, reference: event.target.value })
                }
                placeholder="Nota, invoice, declaração ou comprovantes"
              />
            </label>
          </div>
          <h3>Produtos e valores de origem</h3>
          <p className="footnote">
            Valores iniciais vêm da compra em BRL. Ao trocar a moeda, informe os
            preços da invoice nessa moeda: a troca não converte os campos
            automaticamente. Cada linha é convertida e arredondada em centavos
            antes do rateio.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Preço unitário em {input.currency}</th>
                </tr>
              </thead>
              <tbody>
                {source.purchase.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product.name}</strong>
                      <small className="muted"> · {item.product.sku}</small>
                    </td>
                    <td>{item.quantity}</td>
                    <td>
                      <input
                        aria-label={`Custo de ${item.product.name}`}
                        required
                        type="number"
                        min="0.000001"
                        step="0.000001"
                        max="9999999999.99"
                        value={
                          input.items.find(
                            (row) => row.purchaseItemId === item.id,
                          )?.unitCost || ''
                        }
                        onChange={(event) =>
                          change({
                            ...input,
                            items: input.items.map((row) =>
                              row.purchaseItemId === item.id
                                ? { ...row, unitCost: event.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-head costing-head">
            <div>
              <h3>Impostos, taxas e despesas</h3>
              <p>Todos os valores e bases abaixo são em reais.</p>
            </div>
            <button
              className="btn"
              type="button"
              disabled={input.charges.length >= 60}
              onClick={() =>
                change({
                  ...input,
                  charges: [
                    ...input.charges,
                    {
                      label: '',
                      kind: 'EXPENSE',
                      mode: 'FIXED',
                      amount: '0',
                      rate: '0',
                      base: '0',
                      grossUp: false,
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Adicionar encargo
            </button>
          </div>
          <datalist id="charge-labels">
            {[
              'Frete internacional',
              'Frete nacional',
              'Seguro',
              'II',
              'IPI',
              'ICMS',
              'PIS-Importação',
              'Cofins-Importação',
              'IOF',
              'Taxa Siscomex',
              'Despachante',
              'Armazenagem',
              'Taxa do courier',
              'Outras despesas',
            ].map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
          {input.charges.map((charge, index) => (
            <section
              className="charge-card"
              key={index}
              aria-label={`Encargo ${index + 1}`}
            >
              <div className="form-grid">
                <label>
                  Descrição do encargo {index + 1}
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    list="charge-labels"
                    value={charge.label}
                    onChange={(event) =>
                      chargeChange(index, { label: event.target.value })
                    }
                  />
                </label>
                <label>
                  Categoria {index + 1}
                  <select
                    value={charge.kind}
                    onChange={(event) =>
                      chargeChange(index, {
                        kind: event.target.value as Charge['kind'],
                      })
                    }
                  >
                    <option value="EXPENSE">Despesa / taxa de serviço</option>
                    <option value="TAX">Tributo</option>
                  </select>
                </label>
                <label>
                  Cálculo {index + 1}
                  <select
                    value={charge.mode}
                    onChange={(event) =>
                      chargeChange(index, {
                        mode: event.target.value as Charge['mode'],
                        amount: '0',
                        rate: '0',
                        base: '0',
                        grossUp: false,
                      })
                    }
                  >
                    <option value="FIXED">Valor informado em R$</option>
                    <option value="PERCENT">
                      Percentual sobre base informada
                    </option>
                  </select>
                </label>
                {charge.mode === 'FIXED' ? (
                  <label>
                    Valor em R$ {index + 1}
                    <input
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      required
                      value={charge.amount}
                      onChange={(event) =>
                        chargeChange(index, { amount: event.target.value })
                      }
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Base em R$ {index + 1}
                      <input
                        type="number"
                        min="0"
                        max="9999999999.99"
                        step="0.01"
                        required
                        value={charge.base}
                        onChange={(event) =>
                          chargeChange(index, { base: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Percentual (%) {index + 1}
                      <input
                        type="number"
                        min="0"
                        max={charge.grossUp ? '99.999999' : '100'}
                        step="0.000001"
                        required
                        value={charge.rate}
                        onChange={(event) =>
                          chargeChange(index, { rate: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Forma de cálculo {index + 1}
                      <select
                        value={String(charge.grossUp)}
                        onChange={(event) =>
                          chargeChange(index, {
                            grossUp: event.target.value === 'true',
                          })
                        }
                      >
                        <option value="false">
                          Por fora: base × percentual
                        </option>
                        <option value="true">
                          Por dentro: base × percentual ÷ (1 − percentual)
                        </option>
                      </select>
                    </label>
                  </>
                )}
              </div>
              <button
                className="btn small"
                type="button"
                aria-label={`Remover encargo ${index + 1}`}
                onClick={() =>
                  change({
                    ...input,
                    charges: input.charges.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 size={14} />
                Remover
              </button>
            </section>
          ))}
          {!input.charges.length && (
            <p className="empty">
              Adicione os encargos desta operação, se houver.
            </p>
          )}
          <p className="footnote">
            As bases não são montadas automaticamente e não somam outros
            tributos. Para “por dentro”, informe a base sem o próprio tributo.
            Não repita valores já incluídos no preço dos produtos. Tributos
            recuperáveis não são descontados; o resultado representa desembolso
            informado, não custo fiscal contábil.
          </p>
          <label className="costing-notes">
            Observações
            <textarea
              maxLength={2000}
              value={input.notes}
              onChange={(event) =>
                change({ ...input, notes: event.target.value })
              }
            />
          </label>
          <div className="dialog-actions">
            <button
              type="button"
              className="btn"
              disabled={!dirty}
              onClick={() => setReset(true)}
            >
              Descartar edições
            </button>
            <button className="btn primary" disabled={busy}>
              <Calculator size={16} />
              {busy ? 'Calculando…' : 'Calcular custos'}
            </button>
          </div>
          {dirty && (
            <p className="footnote">
              Edições não salvas. Calcule e salve, ou descarte antes de trocar a
              etapa. Sair desta tela perde as edições.
            </p>
          )}
        </fieldset>
      </form>
      {error && !confirm && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <CostingResult result={result} title="Resultado do cálculo" />
          {can('purchases:create') && (
            <div className="dialog-actions">
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                <Save size={16} />
                Salvar nova revisão · {stageName(stage)}
              </button>
            </div>
          )}
        </>
      )}
      {confirm && (
        <Modal
          title={`Salvar custos · ${stageName(stage)}`}
          busy={busy}
          close={() => setConfirm(false)}
        >
          <div className="detail-body">
            <p>
              Total: <strong>{money(result?.totalBRL)}</strong>. Será criada a
              revisão {input.expectedRevision + 1}.
            </p>
            <p>
              Confira os valores e as bases. Esse registro não altera estoque,
              preço de venda ou custo cadastrado dos produtos.
            </p>
            {stage === 'ACTUAL' && (
              <p>
                Ao confirmar, você declara que estes são os valores realizados
                conforme os documentos informados.
              </p>
            )}
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="btn"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Voltar
              </button>
              <button className="btn primary" disabled={busy} onClick={save}>
                {busy ? 'Salvando…' : 'Confirmar salvamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal title="Descartar edições?" close={() => setReset(false)}>
          <div className="detail-body">
            <p>Os campos voltarão à versão inicial desta etapa.</p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setReset(false)}>
                Continuar editando
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setInput(initial())
                  setResult(
                    latest?.input.purchaseFingerprint ===
                      source.purchaseFingerprint
                      ? latest.output
                      : null,
                  )
                  setDirty(false)
                  dirtyChanged(false)
                  setError('')
                  setReset(false)
                }}
              >
                Confirmar descarte
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
function CostingResult({ result, title }: { result: Result; title: string }) {
  const can = usePermissions()
  function exportResult() {
    downloadCsv(
      'custos-por-produto.csv',
      [
        'Produto',
        'SKU',
        'Quantidade',
        'Produtos BRL',
        'Encargos rateados BRL',
        'Total BRL',
        'Custo unitário BRL',
        'Preço de venda usado BRL',
        'Margem bruta estimada %',
      ],
      result.items.map((item) => [
        item.name,
        item.sku,
        item.quantity,
        item.goodsBRL,
        item.allocatedBRL,
        item.totalBRL,
        item.unitCostBRL,
        item.salePriceBRL,
        item.grossMarginPercent ?? '',
      ]),
    )
  }
  return (
    <section className="panel costing-section">
      <div className="panel-head costing-head">
        <h2>{title}</h2>
        <button className="btn" onClick={exportResult}>
          <Download size={16} />
          Exportar rateio
        </button>
      </div>
      <div className="costing-totals">
        <span>
          Produtos <strong>{money(result.goodsBRL)}</strong>
        </span>
        <span>
          Tributos <strong>{money(result.taxesBRL)}</strong>
        </span>
        <span>
          Despesas <strong>{money(result.expensesBRL)}</strong>
        </span>
        <span>
          Total <strong>{money(result.totalBRL)}</strong>
        </span>
      </div>
      {result.charges.length > 0 && (
        <details>
          <summary>Memória dos encargos</summary>
          <ul>
            {result.charges.map((charge, index) => (
              <li key={index}>
                {charge.label}: {money(charge.amountBRL)}
                {charge.mode === 'PERCENT'
                  ? ` · base ${money(charge.base)} × ${charge.rate}%${charge.grossUp ? ` ÷ (1 − ${charge.rate}%)` : ''}`
                  : ' · valor informado'}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd.</th>
              <th>Produtos</th>
              <th>Encargos rateados</th>
              <th>Custo total</th>
              <th>Custo / un.</th>
              <th>Preço usado</th>
              <th>Margem bruta estimada</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.purchaseItemId}>
                <td>
                  {can('products:read') ? (
                    <Link
                      className="text-link"
                      to={`/products/${item.productId}`}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                  <small className="muted"> · {item.sku}</small>
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.goodsBRL)}</td>
                <td>{money(item.allocatedBRL)}</td>
                <td>
                  <strong>{money(item.totalBRL)}</strong>
                </td>
                <td title={item.unitCostBRL}>{money(item.unitCostBRL)}</td>
                <td>{money(item.salePriceBRL)}</td>
                <td>
                  {item.grossMarginPercent === null
                    ? '—'
                    : `${Number(item.grossMarginPercent).toLocaleString('pt-BR')}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Rateio proporcional ao valor dos produtos em reais; diferenças de
        centavos vão aos maiores restos. Custo unitário exibido com 2 casas; CSV
        preserva 6. Margem = (preço de venda usado − custo unitário) ÷ preço de
        venda. Não inclui tributos da venda, comissões, despesas operacionais ou
        créditos fiscais. O preço usado fica registrado no momento do cálculo
        salvo.
      </p>
    </section>
  )
}
function History({
  purchaseId,
  id,
  close,
}: {
  purchaseId: string
  id: string
  close: () => void
}) {
  const resource = useResource<Sheet>(
    `/purchases/${purchaseId}/costing/revisions/${id}`,
  )
  return (
    <Modal title="Revisão salva · consulta" close={close}>
      <div className="detail-body">
        <Feedback {...resource} retry={resource.reload} />
        {resource.data && (
          <>
            <p>
              {stageName(resource.data.stage)} · revisão{' '}
              {resource.data.revision} · {date(resource.data.createdAt)}
            </p>
            <p>Referência: {resource.data.reference || 'Não informada'}</p>
            <p>
              Moeda: {resource.data.input.currency} · câmbio:{' '}
              {resource.data.input.exchangeRate}
            </p>
            <p className="costing-notes">{resource.data.input.notes}</p>
            <CostingResult
              result={resource.data.output}
              title="Valores preservados"
            />
          </>
        )}
      </div>
    </Modal>
  )
}
