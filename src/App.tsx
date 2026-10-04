import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { Products } from "./pages/Products";
import { Sales } from "./pages/Sales";
import { RequirePermission } from "./components/RequirePermission";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Placeholder } from "./pages/Placeholder";
import { ProtectedRoute } from "./routes/ProtectedRoute";

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
                element={
                  <RequirePermission permissions={["products:read"]}>
                    <Products />
                  </RequirePermission>
                }
              />

              <Route
                path="categories"
                element={
                  <RequirePermission permissions={["products:read"]}>
                    <Placeholder title="Categorias" />
                  </RequirePermission>
                }
              />

              <Route
                path="stock"
                element={
                  <RequirePermission permissions={["stock:read"]}>
                    <Placeholder title="Estoque" />
                  </RequirePermission>
                }
              />

              <Route
                path="sales"
                element={
                  <RequirePermission
                    permissions={["sales:create", "products:read"]}
                  >
                    <Sales />
                  </RequirePermission>
                }
              />

              <Route
                path="purchases"
                element={
                  <RequirePermission permissions={["purchases:read"]}>
                    <Placeholder title="Compras" />
                  </RequirePermission>
                }
              />

              <Route
                path="suppliers"
                element={
                  <RequirePermission permissions={["suppliers:read"]}>
                    <Placeholder title="Fornecedores" />
                  </RequirePermission>
                }
              />

              <Route
                path="reports"
                element={
                  <RequirePermission permissions={["reports:read"]}>
                    <Placeholder title="Relatórios" />
                  </RequirePermission>
                }
              />

              <Route
                path="users"
                element={
                  <RequirePermission permissions={["users:read"]}>
                    <Placeholder title="Usuários" />
                  </RequirePermission>
                }
              />

              <Route
                path="roles"
                element={
                  <RequirePermission permissions={["users:read"]}>
                    <Placeholder title="Funções e permissões" />
                  </RequirePermission>
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
