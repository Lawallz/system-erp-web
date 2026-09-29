import { beforeEach, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '../src/api/http'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ProtectedRoute } from '../src/routes/ProtectedRoute'
import { PermissionRoute, AccessPage } from '../src/routes/PermissionRoute'
import { AppLayout } from '../src/layouts/AppLayout'
let permissions: string[]
let release: (() => void) | undefined
beforeEach(() => {
  permissions = ['sales:create']
  release = undefined
  localStorage.setItem('erp_token', 'test')
  localStorage.setItem(
    'erp_user',
    JSON.stringify({
      name: 'Old Admin',
      permissions: ['users:read', 'products:delete'],
    }),
  )
  api.defaults.adapter = async (config) => {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return {
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: {
        data: { id: 'u1', name: 'Caixa', role: 'Vendedor', permissions },
      },
    }
  }
})
function mount(path = '/sales/new') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="access" element={<AccessPage />} />
              <Route element={<PermissionRoute permission="sales:create" />}>
                <Route path="sales/new" element={<p>Caixa liberado</p>} />
              </Route>
              <Route element={<PermissionRoute permission="users:read" />}>
                <Route path="users" element={<p>Usuários liberados</p>} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}
it('ignores cached privileges and prevents direct navigation to a forbidden route', async () => {
  mount('/users')
  expect(screen.queryByText('Usuários liberados')).toBeNull()
  await waitFor(() => expect(release).toBeTypeOf('function'))
  release!()
  await screen.findByText('Caixa liberado')
  expect(screen.queryByRole('link', { name: 'Usuários' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Produtos' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Venda rápida' })).toBeTruthy()
})
it('refreshes permissions on focus and removes revoked routes', async () => {
  mount()
  await waitFor(() => expect(release).toBeTypeOf('function'))
  release!()
  await screen.findByText('Caixa liberado')
  permissions = []
  release = undefined
  fireEvent(window, new Event('focus'))
  await waitFor(() => expect(release).toBeTypeOf('function'))
  release!()
  await screen.findByText('Acesso aguardando liberação')
  expect(screen.queryByText('Caixa liberado')).toBeNull()
  expect(screen.queryByRole('link', { name: 'Venda rápida' })).toBeNull()
})
