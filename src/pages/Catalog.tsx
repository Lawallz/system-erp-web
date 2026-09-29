import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { usePagedResource } from '../hooks/usePagedResource'
import { ListFilters, PagedTable } from '../components/PagedTable'
import { useState, type FormEvent } from 'react'
import { Plus, Pencil, RefreshCw } from 'lucide-react'
import { api } from '../api/http'
import { errorMessage, money } from '../api/data'
import { useResource } from '../hooks/useResource'
import { Feedback, Modal, PageTitle, type Column } from '../components/UI'
export type RecordRow = {
  id: string
  name: string
  description?: string
  barcode?: string | null
  sku?: string
  price?: string
  costPrice?: string
  stockQuantity?: number
  minStockAlert?: number
  category?: { name: string }
  role?: { name: string }
  isActive?: boolean
  email?: string
  phone?: string
  document?: string
  rolePermissions?: { permissionId: string }[]
  [key: string]: unknown
}
type Field = {
  key: string
  label: string
  type?: string
  optional?: boolean
  source?: string
  min?: number
}
const name: Field = { key: 'name', label: 'Nome', min: 2 }
const description: Field = {
  key: 'description',
  label: 'Descrição',
  optional: true,
}
const configs: Record<
  string,
  {
    title: string
    description: string
    singular: string
    fields: Field[]
    editable: boolean
  }
> = {
  products: {
    title: 'Produtos',
    description: 'Seu catálogo organizado, do custo ao estoque.',
    singular: 'produto',
    editable: true,
    fields: [
      { key: 'sku', label: 'SKU / código', min: 2 },
      { key: 'barcode', label: 'Código de barras', optional: true },
      name,
      description,
      { key: 'price', label: 'Preço de venda (R$)', type: 'number', min: 0.01 },
      {
        key: 'costPrice',
        label: 'Preço de custo (R$)',
        type: 'number',
        min: 0.01,
      },
      { key: 'minStockAlert', label: 'Estoque mínimo', type: 'number', min: 0 },
      { key: 'categoryId', label: 'Categoria', source: '/products/categories' },
    ],
  },
  categories: {
    title: 'Categorias',
    description: 'Organize os produtos em grupos fáceis de encontrar.',
    singular: 'categoria',
    editable: true,
    fields: [name, description],
  },
  suppliers: {
    title: 'Fornecedores',
    description: 'Mantenha os parceiros e contatos da operação por perto.',
    singular: 'fornecedor',
    editable: true,
    fields: [
      name,
      { key: 'document', label: 'CPF / CNPJ', optional: true, min: 5 },
      { key: 'email', label: 'E-mail', type: 'email', optional: true },
      { key: 'phone', label: 'Telefone', optional: true, min: 8 },
      { key: 'address', label: 'Endereço', optional: true, min: 3 },
    ],
  },
  users: {
    title: 'Usuários',
    description: 'Gerencie os integrantes e seus acessos ao sistema.',
    singular: 'usuário',
    editable: true,
    fields: [
      name,
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'password', label: 'Senha inicial', type: 'password', min: 6 },
      { key: 'roleId', label: 'Função', source: '/roles' },
    ],
  },
  roles: {
    title: 'Funções e permissões',
    description: 'Defina as responsabilidades de cada equipe.',
    singular: 'função',
    editable: true,
    fields: [name, { ...description, min: 3 }],
  },
}
export function SelectField({
  field,
  value,
  onChange,
}: {
  field: Field
  value: string
  onChange: (value: string) => void
}) {
  const resource = useResource<RecordRow[]>(field.source!)
  return (
    <>
      <select
        required={!field.optional}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={resource.loading || Boolean(resource.error)}
      >
        <option value="">
          {resource.loading ? 'Carregando…' : 'Selecione uma opção'}
        </option>
        {resource.data
          ?.filter((row) => row.isActive !== false)
          .map((row) => (
            <option value={row.id} key={row.id}>
              {row.name}
              {row.sku ? ` · ${row.sku}` : ''}
            </option>
          ))}
      </select>
      {resource.error && (
        <span className="field-error">
          {resource.error}{' '}
          <button type="button" onClick={resource.reload}>
            Recarregar opções
          </button>
        </span>
      )}
      {!resource.loading && !resource.error && !resource.data?.length && (
        <small>Cadastre uma opção no módulo correspondente primeiro.</small>
      )}
    </>
  )
}
export function Catalog({ module }: { module: string }) {
  const config = configs[module]!
  const can = usePermissions()
  const permissionGroup =
    module === 'categories' ? 'products' : module === 'roles' ? 'users' : module
  const [status, setStatus] = useState('active')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('all')
  const resource = usePagedResource<RecordRow>(
    `/${module}`,
    module === 'products'
      ? { status, stock, ...(category ? { categoryId: category } : {}) }
      : {},
  )
  const categoryResource = useResource<RecordRow[]>(
    module === 'products' ? '/products/categories' : null,
  )
  const categories = categoryResource.data || []
  const [statusRecord, setStatusRecord] = useState<RecordRow | null>(null)
  const [editing, setEditing] = useState<RecordRow | 'new' | null>(null)
  const [permissions, setPermissions] = useState<RecordRow | null>(null)
  const [notice, setNotice] = useState('')
  const columns: Column<RecordRow>[] = [
    {
      label: 'Nome',
      render: (row) => (
        <div className="cell-name">
          {module === 'products' ? (
            <Link className="text-link" to={`/products/${row.id}`}>
              {row.name}
            </Link>
          ) : (
            row.name
          )}
          <small>{row.sku || row.description || row.email}</small>
        </div>
      ),
    },
  ]
  if (module === 'products')
    columns.push(
      { label: 'Categoria', render: (row) => row.category?.name || '—' },
      { label: 'Preço', render: (row) => money(row.price) },
      {
        label: 'Margem bruta',
        render: (row) => {
          const margin =
            Number(row.price) > 0
              ? ((Number(row.price) - Number(row.costPrice)) /
                  Number(row.price)) *
                100
              : null
          return (
            <span
              className={`badge ${margin !== null && margin <= 0 ? 'warning' : ''}`}
            >
              {margin === null
                ? '—'
                : `${margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
            </span>
          )
        },
      },
      {
        label: 'Estoque',
        render: (row) => (
          <span
            className={`badge ${Number(row.stockQuantity) <= Number(row.minStockAlert) ? 'warning' : ''}`}
          >
            {row.stockQuantity} un.
          </span>
        ),
      },
    )
  if (module === 'suppliers')
    columns.push(
      { label: 'Documento', render: (row) => row.document || '—' },
      { label: 'Contato', render: (row) => row.phone || row.email || '—' },
    )
  if (module === 'users')
    columns.push({ label: 'Função', render: (row) => row.role?.name || '—' })
  if (module === 'suppliers' || module === 'users' || module === 'products')
    columns.push({
      label: 'Status',
      render: (row) => (
        <span className={`badge ${row.isActive ? '' : 'neutral'}`}>
          {row.isActive ? 'Ativo' : 'Inativo'}
        </span>
      ),
    })
  if (config.editable)
    columns.push({
      label: 'Ações',
      render: (row) => (
        <div className="row-actions">
          {can(`${permissionGroup}:update`) && (
            <button className="btn small" onClick={() => setEditing(row)}>
              <Pencil size={14} />
              Editar
            </button>
          )}
          {['products', 'users', 'suppliers'].includes(module) &&
            can(
              `${permissionGroup}:${row.isActive === false || module === 'suppliers' ? 'update' : 'delete'}`,
            ) && (
              <button
                className="btn small"
                onClick={() => setStatusRecord(row)}
              >
                {row.isActive === false ? 'Reativar' : 'Desativar'}
              </button>
            )}
          {module === 'roles' && can('users:update') && (
            <button className="btn small" onClick={() => setPermissions(row)}>
              Permissões
            </button>
          )}
        </div>
      ),
    })
  return (
    <>
      <PageTitle
        title={config.title}
        description={config.description}
        action={
          <div className="row-actions">
            <button
              className="icon-btn"
              aria-label="Atualizar lista"
              onClick={resource.reload}
            >
              <RefreshCw size={18} />
            </button>
            {can(`${permissionGroup}:create`) && (
              <button className="btn primary" onClick={() => setEditing('new')}>
                <Plus size={17} />
                Novo cadastro
              </button>
            )}
          </div>
        }
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {module === 'products' && (
        <div className="catalog-filters">
          <label>
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setCategory('')
              }}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
          </label>
          <label>
            Filtrar por categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas as categorias</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Saldo
            <select
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            >
              <option value="all">Todos os saldos</option>
              <option value="low">No mínimo ou abaixo</option>
              <option value="out">Sem estoque</option>
            </select>
          </label>
          <button
            className="btn"
            onClick={() => {
              setStatus('active')
              setCategory('')
              setStock('all')
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
      <ListFilters resource={resource} />
      <p className="footnote">Período de cadastro · datas em UTC−03.</p>
      <PagedTable resource={resource} columns={columns} />
      {module === 'products' && (
        <p className="footnote">
          As quantidades são atualizadas pelas movimentações de estoque e pelas
          operações de compra e venda. A margem bruta usa o custo e preço
          atuais, sem impostos ou despesas.
        </p>
      )}
      {editing &&
        can(
          `${permissionGroup}:${editing === 'new' ? 'create' : 'update'}`,
        ) && (
          <Editor
            module={module}
            record={editing}
            close={() => setEditing(null)}
            saved={() => {
              setEditing(null)
              setNotice('Cadastro salvo com sucesso.')
              resource.reload()
            }}
          />
        )}
      {statusRecord &&
        can(
          `${permissionGroup}:${statusRecord.isActive === false || module === 'suppliers' ? 'update' : 'delete'}`,
        ) && (
          <StatusEditor
            module={module}
            record={statusRecord}
            close={() => setStatusRecord(null)}
            saved={() => {
              setStatusRecord(null)
              setNotice('Status atualizado com sucesso.')
              resource.reload()
            }}
          />
        )}
      {permissions && can('users:update') && (
        <PermissionsEditor
          record={permissions}
          close={() => setPermissions(null)}
          saved={() => {
            setPermissions(null)
            setNotice('Permissões atualizadas.')
            resource.reload()
          }}
        />
      )}
    </>
  )
}
function Editor({
  module,
  record,
  close,
  saved,
}: {
  module: string
  record: RecordRow | 'new'
  close: () => void
  saved: () => void
}) {
  const config = configs[module]!
  const fields = config.fields.filter(
    (field) => !(record !== 'new' && field.key === 'password'),
  )
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        record === 'new'
          ? field.key === 'minStockAlert'
            ? '0'
            : ''
          : String(record[field.key] ?? ''),
      ]),
    ),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const payload = Object.fromEntries(
      fields
        .filter(
          (field) =>
            !field.optional ||
            values[field.key] !== '' ||
            (module === 'products' &&
              record !== 'new' &&
              (field.key === 'description' || field.key === 'barcode')),
        )
        .map((field) => [
          field.key,
          field.type === 'number'
            ? Number(values[field.key])
            : values[field.key],
        ]),
    )
    try {
      if (record === 'new') await api.post(`/${module}`, payload)
      else await api.put(`/${module}/${record.id}`, payload)
      window.dispatchEvent(new Event('erp:permissions-changed'))
      saved()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`${record === 'new' ? 'Cadastrar' : 'Editar'} ${config.singular}`}
      close={close}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.optional && <small> (opcional)</small>}
              {field.source ? (
                <SelectField
                  field={field}
                  value={values[field.key] || ''}
                  onChange={(value) =>
                    setValues({ ...values, [field.key]: value })
                  }
                />
              ) : (
                <input
                  required={!field.optional}
                  type={field.type || 'text'}
                  minLength={field.type !== 'number' ? field.min : undefined}
                  min={field.type === 'number' ? field.min : undefined}
                  step={
                    field.type === 'number'
                      ? field.key === 'minStockAlert'
                        ? 1
                        : '0.01'
                      : undefined
                  }
                  autoComplete={
                    field.type === 'password' ? 'new-password' : undefined
                  }
                  value={values[field.key] || ''}
                  onChange={(event) =>
                    setValues({ ...values, [field.key]: event.target.value })
                  }
                />
              )}
            </label>
          ))}
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar cadastro'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
function PermissionsEditor({
  record,
  close,
  saved,
}: {
  record: RecordRow
  close: () => void
  saved: () => void
}) {
  const resource = useResource<RecordRow[]>('/roles/permissions')
  const detail = useResource<RecordRow>(`/roles/${record.id}`)
  const [selected, setSelected] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ids =
    selected ??
    detail.data?.rolePermissions?.map((item) => item.permissionId) ??
    []
  async function save() {
    setBusy(true)
    setError('')
    try {
      await api.put(`/roles/${record.id}/permissions`, { permissionIds: ids })
      window.dispatchEvent(new Event('erp:permissions-changed'))
      saved()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={`Permissões · ${record.name}`} close={close} busy={busy}>
      <Feedback
        loading={resource.loading || detail.loading}
        error={resource.error || detail.error}
        retry={() => {
          resource.reload()
          detail.reload()
        }}
      />
      {!resource.loading &&
        !detail.loading &&
        !resource.error &&
        !detail.error && (
          <div className="permissions">
            {resource.data?.map((permission) => (
              <label key={permission.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(permission.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...ids, permission.id]
                        : ids.filter((id) => id !== permission.id),
                    )
                  }
                />
                <span>
                  {permission.name}
                  <small>{permission.description}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="dialog-actions">
        <button className="btn" onClick={close} disabled={busy}>
          Cancelar
        </button>
        <button
          className="btn primary"
          onClick={save}
          disabled={
            busy ||
            !ids.length ||
            resource.loading ||
            detail.loading ||
            Boolean(resource.error || detail.error)
          }
        >
          Salvar permissões
        </button>
      </div>
    </Modal>
  )
}

function StatusEditor({
  module,
  record,
  close,
  saved,
}: {
  module: string
  record: RecordRow
  close: () => void
  saved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const activate = record.isActive === false
  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await api.patch(
        `/${module}/${record.id}/${activate ? 'activate' : 'deactivate'}`,
      )
      window.dispatchEvent(new Event('erp:permissions-changed'))
      saved()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`${activate ? 'Reativar' : 'Desativar'} ${record.name}`}
      close={close}
      busy={busy}
    >
      <div className="detail-body">
        <p>
          {activate
            ? 'O cadastro voltará a estar disponível para uso.'
            : module === 'users'
              ? 'Este usuário perderá o acesso ao sistema. O histórico será preservado.'
              : 'O cadastro deixará de aparecer nas opções de novas operações. O histórico será preservado.'}
        </p>
        {module === 'products' && !activate && (
          <p className="footnote">
            O saldo atual de {record.stockQuantity} unidades será mantido.
            Compras pendentes deste produto podem exigir reativação antes do
            recebimento.
          </p>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="btn" disabled={busy} onClick={close}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy} onClick={confirm}>
            {busy
              ? 'Atualizando…'
              : activate
                ? 'Confirmar reativação'
                : 'Confirmar desativação'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
