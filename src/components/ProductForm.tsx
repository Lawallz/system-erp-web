import { useRef, useState, type FormEvent } from "react";
import { api } from "../api/http";
import type { Category, Product, ProductInput } from "../api/types";
import { useResource } from "../hooks/useResource";
import { errorMessage } from "../lib/format";
import { ErrorState, Loading, Modal } from "./ui";
import { useAuth } from "../contexts/auth-context";

export function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [addedCategories, setAddedCategories] = useState<Category[]>([]);
  const categories = useResource<Category[]>("/products/categories", revision);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const { can } = useAuth();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const body: ProductInput = {
      name: String(form.get("name")).trim(),
      sku: String(form.get("sku")).trim(),
      description: String(form.get("description")).trim(),
      price: Number(form.get("price")),
      costPrice: Number(form.get("costPrice")),
      categoryId,
      minStockAlert: Number(form.get("minStockAlert")),
    };
    if (body.name.length < 2 || body.sku.length < 2) {
      setError("Nome e SKU precisam ter pelo menos 2 caracteres.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (product) await api.put(`/products/${product.id}`, body);
      else await api.post("/products", body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function createCategory() {
    if (lock.current || newCategory.trim().length < 2) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await api.post<Category>("/products/categories", {
        name: newCategory.trim(),
      });
      setAddedCategories((items) => [...items, response.data]);
      setCategoryId(response.data.id);
      setNewCategory("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={product ? "Editar produto" : "Novo produto"}
      onClose={onClose}
      busy={busy}
    >
      <p className="muted form-intro">
        Organize seu catálogo. O saldo de estoque é controlado pelas
        movimentações.
      </p>
      {categories.loading ? (
        <Loading />
      ) : categories.error ? (
        <ErrorState
          message={categories.error}
          retry={() => setRevision((v) => v + 1)}
        />
      ) : (
        <form onSubmit={save}>
          <fieldset disabled={busy} className="form-grid">
            <label className="full">
              Nome do produto
              <input
                name="name"
                autoFocus
                required
                minLength={2}
                maxLength={160}
                defaultValue={product?.name}
                placeholder="Ex.: Café especial 250 g"
              />
            </label>
            <label>
              SKU / código
              <input
                name="sku"
                required
                minLength={2}
                maxLength={120}
                defaultValue={product?.sku}
                placeholder="Ex.: CAF-001"
              />
            </label>
            <label>
              Categoria
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Selecione</option>
                {[...(categories.data || []), ...addedCategories].map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preço de venda (R$)
              <input
                name="price"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                defaultValue={product?.price}
              />
            </label>
            <label>
              Preço de custo (R$)
              <input
                name="costPrice"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                defaultValue={product?.costPrice}
              />
            </label>
            <label>
              Estoque mínimo
              <input
                name="minStockAlert"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                required
                defaultValue={product?.minStockAlert ?? 0}
              />
            </label>
            <label className="full">
              Descrição <span className="muted">(opcional)</span>
              <textarea
                name="description"
                rows={3}
                maxLength={2000}
                defaultValue={product?.description || ""}
              />
            </label>
          </fieldset>
          {can("products:create") && (
            <details className="category-create">
              <summary>Precisa de uma nova categoria?</summary>
              <div className="button-row">
                <input
                  aria-label="Nome da nova categoria"
                  placeholder="Nome da categoria"
                  value={newCategory}
                  disabled={busy}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy || newCategory.trim().length < 2}
                  onClick={createCategory}
                >
                  Criar categoria
                </button>
              </div>
            </details>
          )}
          {error && <ErrorState message={error} />}
          <div className="modal-actions">
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={
                busy || !(categories.data?.length || addedCategories.length)
              }
            >
              {busy ? "Salvando…" : "Salvar produto"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
