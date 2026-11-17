import { useState } from "react";
import { ArrowUpRight, Package, Pencil, Plus, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
  const [locationParams, setLocationParams] = useSearchParams();
  const search = (locationParams.get("search") ?? "").slice(0, 120);
  const categoryParam = locationParams.get("categoryId") ?? "";
  const category = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(categoryParam)
    ? categoryParam
    : "";
  const pageParam = Number(locationParams.get("page"));
  const pageSize = 12;
  const maxPage = Math.floor(2_147_483_647 / pageSize) + 1;
  const page =
    Number.isSafeInteger(pageParam) && pageParam > 0 && pageParam <= maxPage
      ? pageParam
      : 1;

  function updateFilters(
    changes: Record<string, string>,
    replace = false,
  ) {
    setLocationParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace });
  }
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [success, setSuccess] = useState("");
  const query = useDebounced(search);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search: query.trim(),
  });
  if (category) params.set("categoryId", category);
  const result = useResource<ProductPage>(
    `/products?${params}`,
    revision,
    search === query,
  );
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
              maxLength={120}
              onChange={(event) =>
                updateFilters({ search: event.target.value, page: "" }, true)
              }
            />
          </div>
          <select
            aria-label="Filtrar por categoria"
            value={category}
            onChange={(event) =>
              updateFilters({ categoryId: event.target.value, page: "" })
            }
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
              onClick={() => updateFilters({ search: "", categoryId: "", page: "" })}
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
        ) : result.data && page > Math.max(1, result.data.totalPages) ? (
          <EmptyState title="Página indisponível">
            <button className="btn secondary" onClick={() => updateFilters({ page: "" }, true)}>
              Voltar à primeira página
            </button>
          </EmptyState>
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
        {!result.loading && !result.error && result.data && page <= result.data.totalPages && (
          <Pagination
            page={page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            onChange={(next) => updateFilters({ page: next === 1 ? "" : String(next) })}
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
