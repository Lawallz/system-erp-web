import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Barcode,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { api } from "../api/http";
import type { Product, ProductPage } from "../api/types";
import { useDebounced, useResource } from "../hooks/useResource";
import { currency, errorMessage } from "../lib/format";
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeading,
  Pagination,
} from "../components/ui";
import axios from "axios";
import { useAuth } from "../contexts/auth-context";

type CartItem = { product: Product; quantity: number };
type Receipt = { id: string; totalAmount: string | number };
function restoreDraft(key: string): { items: CartItem[]; uncertain: boolean } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      saved &&
      Array.isArray(saved.items) &&
      saved.items.every(
        (item: CartItem) =>
          item.product &&
          typeof item.product.id === "string" &&
          typeof item.product.name === "string" &&
          typeof item.product.sku === "string" &&
          Number.isFinite(Number(item.product.price)) &&
          Number.isInteger(item.product.stockQuantity) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      )
    )
      return { items: saved.items, uncertain: saved.uncertain === true };
  } catch {
    /* An unavailable or invalid draft must not block the workspace. */
  }
  return { items: [], uncertain: false };
}
export function Sales() {
  const { user } = useAuth();
  const draftKey = `erp:sale-draft:v1:${user!.id}`;
  const [draft] = useState(() => restoreDraft(draftKey));
  const [search, setSearch] = useState("");
  const query = useDebounced(search);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [cart, setCart] = useState<CartItem[]>(draft.items);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(draft.uncertain);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const scanner = useRef<AbortController | null>(null);
  const result = useResource<ProductPage>(
    `/products?${new URLSearchParams({ page: String(page), pageSize: "8", search: query })}`,
    revision,
  );
  const total =
    cart.reduce(
      (sum, item) =>
        sum + Math.round(Number(item.product.price) * 100) * item.quantity,
      0,
    ) / 100;
  const units = cart.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => () => scanner.current?.abort(), []);
  useEffect(() => {
    try {
      if (!cart.length) sessionStorage.removeItem(draftKey);
      else
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ items: cart, uncertain }),
        );
    } catch {
      /* The unload warning still protects environments without session storage. */
    }
  }, [cart, uncertain, draftKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    if (cart.length) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [cart.length]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "F2") {
        event.preventDefault();
        input.current?.focus();
      }
      if (
        event.ctrlKey &&
        event.key === "Enter" &&
        cart.length &&
        !busy &&
        !uncertain
      ) {
        event.preventDefault();
        setConfirm(true);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [cart.length, busy, uncertain]);
  function add(product: Product) {
    if (lock.current || uncertain) return;
    setError("");
    setReceipt(null);
    const existing = cart.find((item) => item.product.id === product.id);
    if ((existing?.quantity || 0) >= product.stockQuantity) {
      setError(
        `Estoque disponível de ${product.name}: ${product.stockQuantity} unidades.`,
      );
      return;
    }
    setCart((items) => {
      const found = items.find((item) => item.product.id === product.id);
      if ((found?.quantity || 0) >= product.stockQuantity) return items;
      return found
        ? items.map((item) =>
            item.product.id === product.id
              ? { product, quantity: item.quantity + 1 }
              : item,
          )
        : [...items, { product, quantity: 1 }];
    });
    setNotice(`${product.name} adicionado ao carrinho.`);
  }
  function quantity(id: string, delta: number) {
    if (lock.current || uncertain) return;
    setCart((items) =>
      items
        .map((item) =>
          item.product.id === id
            ? {
                ...item,
                quantity: Math.min(
                  item.product.stockQuantity,
                  item.quantity + delta,
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }
  async function scan(event: FormEvent) {
    event.preventDefault();
    if (!search.trim() || lock.current || uncertain) return;
    scanner.current?.abort();
    const controller = new AbortController();
    scanner.current = controller;
    try {
      const response = await api.get<ProductPage>(
        `/products?${new URLSearchParams({ sku: search.trim(), page: "1", pageSize: "1" })}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted || lock.current) return;
      if (response.data.data[0]) {
        add(response.data.data[0]);
        setSearch("");
        setPage(1);
        input.current?.focus();
      } else
        setError(
          "SKU não encontrado. Para buscar pelo nome, selecione um produto nos resultados.",
        );
    } catch (err) {
      if (!controller.signal.aborted) setError(errorMessage(err));
    }
  }
  async function checkout() {
    if (lock.current || !cart.length || uncertain) return;
    lock.current = true;
    scanner.current?.abort();
    setBusy(true);
    setError("");
    try {
      const response = await api.post<{ data: Receipt }>("/sales", {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });
      setReceipt(response.data.data);
      setCart([]);
      setConfirm(false);
      setRevision((v) => v + 1);
      setNotice("Venda registrada com sucesso.");
    } catch (err) {
      const unknownOutcome =
        !axios.isAxiosError(err) || !err.response || err.response.status >= 500;
      setUncertain(unknownOutcome);
      setError(
        unknownOutcome
          ? "Não foi possível confirmar o resultado da venda. Confira o registro com o responsável antes de repetir a operação, para evitar duplicidade."
          : errorMessage(err),
      );
      setConfirm(false);
      setRevision((v) => v + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Operação / Venda rápida"
        title="Uma venda. Poucos cliques."
        description="Encontre o produto, monte o carrinho e revise antes de concluir."
        action={
          <span className="shortcut">
            <kbd>F2</kbd> Buscar produto
          </span>
        }
      />
      <p className="sr-only" role="status">
        {notice}
      </p>
      {receipt && (
        <div className="receipt" role="status">
          <Check size={24} />
          <div>
            <strong>Venda registrada · {currency(receipt.totalAmount)}</strong>
            <p>Estoque atualizado. Comprovante: {receipt.id}</p>
          </div>
        </div>
      )}
      {error && <ErrorState message={error} />}
      {uncertain && !error && (
        <ErrorState message="Esta venda ficou sem confirmação. Confira o registro com o responsável antes de repetir, para evitar duplicidade." />
      )}
      {uncertain && (
        <button
          className="btn secondary"
          onClick={() => {
            if (
              window.confirm(
                "Você conferiu os registros e confirmou que esta venda NÃO foi registrada?",
              )
            ) {
              setUncertain(false);
              setError("");
            }
          }}
        >
          Já conferi: a venda não foi registrada
        </button>
      )}
      <div className="sales-layout">
        <section className="panel catalog-picker">
          <form className="toolbar" onSubmit={scan}>
            <div className="search-field">
              <Search size={19} />
              <input
                ref={input}
                aria-label="Buscar nome ou ler SKU"
                placeholder="Nome, SKU ou leitor de código…"
                value={search}
                disabled={busy || uncertain}
                onChange={(e) => {
                  scanner.current?.abort();
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button
              className="icon-btn"
              aria-label="Adicionar SKU exato"
              disabled={busy || uncertain || !search.trim()}
            >
              <Barcode size={22} />
            </button>
          </form>
          <p className="picker-hint">
            Leitor com Enter adiciona o SKU exato. Para nomes, escolha abaixo.
          </p>
          {result.loading || search !== query ? (
            <Loading />
          ) : result.error ? (
            <ErrorState
              message={result.error}
              retry={() => setRevision((v) => v + 1)}
            />
          ) : !result.data?.data.length ? (
            <EmptyState title="Nenhum produto encontrado">
              Tente outro nome ou SKU.
            </EmptyState>
          ) : (
            <div className="product-grid">
              {result.data.data.map((product) => (
                <button
                  className="picker-card"
                  key={product.id}
                  disabled={
                    busy ||
                    uncertain ||
                    product.stockQuantity === 0 ||
                    (cart.find((item) => item.product.id === product.id)
                      ?.quantity || 0) >= product.stockQuantity
                  }
                  onClick={() => add(product)}
                >
                  <div className="picker-card-top">
                    <span className="product-avatar">
                      {product.name.slice(0, 2).toUpperCase()}
                    </span>
                    <Plus size={18} />
                  </div>
                  <span className="muted">{product.category.name}</span>
                  <strong>{product.name}</strong>
                  <small>{product.sku}</small>
                  <div className="picker-card-bottom">
                    <b>{currency(product.price)}</b>
                    <span>{product.stockQuantity} un.</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {result.data && (
            <Pagination
              page={page}
              totalPages={result.data.totalPages}
              total={result.data.total}
              onChange={setPage}
            />
          )}
        </section>
        <aside className="panel cart-panel">
          <div className="cart-heading">
            <div>
              <p className="eyebrow">Nova venda</p>
              <h2>
                Seu carrinho <span>{units}</span>
              </h2>
            </div>
            <ShoppingBag size={23} />
          </div>
          {!cart.length ? (
            <EmptyState title="Pronto para a próxima venda">
              Selecione um produto para começar.
            </EmptyState>
          ) : (
            <ul className="cart-items">
              {cart.map((item) => (
                <li key={item.product.id}>
                  <div className="cart-item-title">
                    <strong>{item.product.name}</strong>
                    <button
                      className="icon-btn"
                      aria-label={`Remover ${item.product.name}`}
                      disabled={busy || uncertain}
                      onClick={() =>
                        setCart((items) =>
                          items.filter((i) => i.product.id !== item.product.id),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <small className="muted">
                    {currency(item.product.price)} / un. · {item.product.sku}
                  </small>
                  <div className="cart-item-bottom">
                    <div className="quantity-control">
                      <button
                        aria-label={`Diminuir ${item.product.name}`}
                        disabled={busy || uncertain}
                        onClick={() => quantity(item.product.id, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`Aumentar ${item.product.name}`}
                        disabled={
                          busy ||
                          uncertain ||
                          item.quantity >= item.product.stockQuantity
                        }
                        onClick={() => quantity(item.product.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong>
                      {currency(
                        (Math.round(Number(item.product.price) * 100) *
                          item.quantity) /
                          100,
                      )}
                    </strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="cart-summary">
            <div>
              <span>Total estimado</span>
              <strong>{currency(total)}</strong>
            </div>
            <p>
              O servidor confirma os preços atuais e a disponibilidade ao
              registrar a venda.
            </p>
            <button
              className="btn primary"
              disabled={!cart.length || busy || uncertain}
              onClick={() => setConfirm(true)}
            >
              Revisar venda <span>Ctrl + Enter</span>
            </button>
            {cart.length > 0 && (
              <p className="muted">
                Rascunho mantido nesta aba. Confira preços e estoque ao retomar.
              </p>
            )}
          </div>
        </aside>
      </div>
      {confirm && (
        <Modal
          title="Confirmar venda"
          onClose={() => setConfirm(false)}
          busy={busy}
        >
          <div className="checkout-review">
            <p>
              {units} unidade{units !== 1 ? "s" : ""} em {cart.length} produto
              {cart.length !== 1 ? "s" : ""}.
            </p>
            <strong>{currency(total)}</strong>
            <p className="muted">
              Ao confirmar, a venda será registrada e o estoque será baixado. O
              total final usa os preços vigentes na API.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Voltar ao carrinho
            </button>
            <button className="btn primary" disabled={busy} onClick={checkout}>
              {busy ? "Registrando…" : "Confirmar e registrar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
