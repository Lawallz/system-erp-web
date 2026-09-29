import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Catalog } from './pages/Catalog'
import { Operations } from './pages/Operations'
import { Reports } from './pages/Reports'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />

              <Route
                path="products"
                element={<Catalog key="products" module="products" />}
              />

              <Route
                path="categories"
                element={<Catalog key="categories" module="categories" />}
              />

              <Route
                path="stock"
                element={<Operations key="stock" module="stock" />}
              />

              <Route
                path="sales"
                element={<Operations key="sales" module="sales" />}
              />

              <Route
                path="purchases"
                element={<Operations key="purchases" module="purchases" />}
              />

              <Route
                path="suppliers"
                element={<Catalog key="suppliers" module="suppliers" />}
              />

              <Route path="reports" element={<Reports />} />

              <Route
                path="users"
                element={<Catalog key="users" module="users" />}
              />

              <Route
                path="roles"
                element={<Catalog key="roles" module="roles" />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
