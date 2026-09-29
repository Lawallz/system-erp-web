import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Catalog } from './pages/Catalog'
import { Operations } from './pages/Operations'
import { Inventory } from './pages/Inventory'
import { Reports } from './pages/Reports'
import { SalesWorkspace } from './pages/SalesWorkspace'
import { ProductDetails } from './pages/ProductDetails'
import { PermissionRoute, AccessPage } from './routes/PermissionRoute'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="access" element={<AccessPage />} />
              <Route element={<PermissionRoute permission="reports:read" />}>
                <Route index element={<Dashboard />} />
              </Route>
              <Route element={<PermissionRoute permission="products:read" />}>
                <Route
                  path="products"
                  element={<Catalog key="products" module="products" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="products:read" />}>
                <Route path="products/:id" element={<ProductDetails />} />
              </Route>
              <Route element={<PermissionRoute permission="products:read" />}>
                <Route
                  path="categories"
                  element={<Catalog key="categories" module="categories" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="stock:read" />}>
                <Route
                  path="stock"
                  element={<Operations key="stock" module="stock" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="sales:read" />}>
                <Route
                  path="sales"
                  element={<Operations key="sales" module="sales" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="sales:create" />}>
                <Route path="sales/new" element={<SalesWorkspace />} />
              </Route>
              <Route element={<PermissionRoute permission="purchases:read" />}>
                <Route
                  path="purchases"
                  element={<Operations key="purchases" module="purchases" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="suppliers:read" />}>
                <Route
                  path="suppliers"
                  element={<Catalog key="suppliers" module="suppliers" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="reports:read" />}>
                <Route path="inventory" element={<Inventory />} />
              </Route>
              <Route element={<PermissionRoute permission="reports:read" />}>
                <Route path="reports" element={<Reports />} />
              </Route>
              <Route element={<PermissionRoute permission="users:read" />}>
                <Route
                  path="users"
                  element={<Catalog key="users" module="users" />}
                />
              </Route>
              <Route element={<PermissionRoute permission="users:read" />}>
                <Route
                  path="roles"
                  element={<Catalog key="roles" module="roles" />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
