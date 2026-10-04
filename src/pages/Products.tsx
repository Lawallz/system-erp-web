import { useState } from "react";
import { ArrowUpRight, Package, Pencil, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { Category, Product, ProductPage } from "../api/types";
import { useDebounced, useResource } from "../hooks/useResource";
import { useAuth } from "../contexts/auth-context";
import { currency } from "../lib/format";
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeading,
  Pagination,
} from "../components/ui";
import { ProductForm } from "../components/ProductForm";

export function Products() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [success, setSuccess] = useState("");
  const query = useDebounced(search);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "12",
    search: query,
  });
  if (category) params.set("categoryId", category);
  const result = useResource<ProductPage>(`/products?${params}`, revision);
  const categories = useResource<Category[]>("/products/categories", revision);
  const searching = search !== query;
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Catálogo / Produtos"
        title="Cada produto, no seu lugar."
        description="Preços, categorias e disponibilidade em uma visão organizada."
        action={
          can("products:create") && (
            <button className="btn primary" onClick={() => setEditor("new")}>
              <Plus size={18} />
              Novo produto
            </button>
          )
        }
      />
      <div className="catalog-banner">
        <div className="catalog-banner-icon">
          <Package size={28} />
        </div>
        <div>
          <strong>Seu catálogo é o começo de uma boa venda.</strong>
          <p>Cadastre com cuidado. Encontre em segundos.</p>
        </div>
        {can("sales:create") && (
          <Link to="/sales" className="btn secondary">
            Ir para venda rápida
            <ArrowUpRight size={17} />
          </Link>
        )}
      </div>
      {success && (
        <div className="success-state" role="status">
          {success}
          <button
            onClick={() => setSuccess("")}
            aria-label="Dispensar confirmação"
          >
            ×
          </button>
        </div>
      )}
      <section className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={19} />
            <input
              aria-label="Buscar produtos"
              placeholder="Buscar por nome ou SKU…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Filtrar por categoria"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {(search || category) && (
            <button
              className="btn ghost"
              onClick={() => {
                setSearch("");
                setCategory("");
                setPage(1);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
        {categories.error && (
          <ErrorState
            message={`Categorias: ${categories.error}`}
            retry={() => setRevision((v) => v + 1)}
          />
        )}
        {result.loading || searching ? (
          <Loading />
        ) : result.error ? (
          <ErrorState
            message={result.error}
            retry={() => setRevision((v) => v + 1)}
          />
        ) : !result.data?.data.length ? (
          <EmptyState
            title={
              search || category
                ? "Nenhum produto encontrado"
                : "Seu catálogo começa aqui"
            }
          >
            <p>
              {search || category
                ? "Experimente outro termo ou remova os filtros."
                : "Cadastre seu primeiro produto para organizar a operação."}
            </p>
            {can("products:create") && !search && !category && (
              <button className="btn primary" onClick={() => setEditor("new")}>
                Cadastrar primeiro produto
              </button>
            )}
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço de venda</th>
                  <th>Estoque</th>
                  {can("products:update") && (
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {result.data.data.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <span className="product-avatar">
                          {product.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>{product.name}</strong>
                          <small>{product.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-tag">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="numeric">
                      <strong>{currency(product.price)}</strong>
                    </td>
                    <td>
                      <span
                        className={`stock-badge ${product.stockQuantity <= product.minStockAlert ? "low" : ""}`}
                      >
                        {product.stockQuantity === 0
                          ? "Sem estoque"
                          : `${product.stockQuantity} un.`}
                      </span>
                      {product.stockQuantity > 0 &&
                        product.stockQuantity <= product.minStockAlert && (
                          <small className="stock-hint">Abaixo do mínimo</small>
                        )}
                    </td>
                    {can("products:update") && (
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={`Editar ${product.name}`}
                          onClick={() => setEditor(product)}
                        >
                          <Pencil size={17} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!result.loading && !result.error && result.data && (
          <Pagination
            page={page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            onChange={setPage}
          />
        )}
      </section>
      {editor && (
        <ProductForm
          product={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setSuccess(
              editor === "new"
                ? "Produto cadastrado com sucesso."
                : "Produto atualizado com sucesso.",
            );
            setRevision((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
