import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Placeholder } from './pages/Placeholder'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={<Login />}
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route
                index
                element={<Dashboard />}
              />

              <Route
                path="products"
                element={<Placeholder title="Produtos" />}
              />

              <Route
                path="categories"
                element={<Placeholder title="Categorias" />}
              />

              <Route
                path="stock"
                element={<Placeholder title="Estoque" />}
              />

              <Route
                path="sales"
                element={<Placeholder title="Vendas" />}
              />

              <Route
                path="purchases"
                element={<Placeholder title="Compras" />}
              />

              <Route
                path="suppliers"
                element={<Placeholder title="Fornecedores" />}
              />

              <Route
                path="reports"
                element={<Placeholder title="Relatórios" />}
              />

              <Route
                path="users"
                element={<Placeholder title="Usuários" />}
              />

              <Route
                path="roles"
                element={<Placeholder title="Funções e permissões" />}
              />
            </Route>
          </Route>

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App