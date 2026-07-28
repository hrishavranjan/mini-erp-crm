import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Product, Pagination } from "../types";

const EMPTY_FORM = {
  product_name: "",
  sku: "",
  category: "",
  unit_price: "",
  current_stock: "",
  min_stock_alert_qty: "",
  location: "",
};

export default function Products() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "warehouse";
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "true");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [movementQty, setMovementQty] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (lowStockOnly) params.set("lowStock", "true");
      const { data } = await api.get(`/products?${params.toString()}`);
      setProducts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, lowStockOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setForm({
      product_name: p.product_name,
      sku: p.sku,
      category: p.category || "",
      unit_price: String(p.unit_price),
      current_stock: String(p.current_stock),
      min_stock_alert_qty: String(p.min_stock_alert_qty),
      location: p.location || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError("");
    if (!form.product_name.trim() || !form.sku.trim()) {
      setFormError("Product name and SKU are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        product_name: form.product_name,
        sku: form.sku,
        category: form.category || null,
        unit_price: Number(form.unit_price) || 0,
        min_stock_alert_qty: Number(form.min_stock_alert_qty) || 0,
        location: form.location || null,
      };
      if (!editingId) payload.current_stock = Number(form.current_stock) || 0;

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openStockModal(p: Product) {
    setStockModalProduct(p);
    setMovementType("IN");
    setMovementQty("");
    setMovementReason("");
    setMovementError("");
  }

  async function handleStockMovement() {
    if (!stockModalProduct) return;
    setMovementError("");
    const qty = Number(movementQty);
    if (!qty || qty <= 0) {
      setMovementError("Enter a valid positive quantity.");
      return;
    }
    setSavingMovement(true);
    try {
      await api.post(`/products/${stockModalProduct.id}/stock-movement`, {
        quantity: qty,
        movement_type: movementType,
        reason: movementReason || undefined,
      });
      setStockModalProduct(null);
      fetchProducts();
    } catch (err) {
      setMovementError(getErrorMessage(err));
    } finally {
      setSavingMovement(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>Products & Stock</h2>
          <p className="subtitle">Manage inventory, pricing, and stock movements.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Product</button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ minWidth: 260 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setSearchParams(e.target.checked ? { lowStock: "true" } : {});
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products found.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.current_stock <= p.min_stock_alert_qty;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{p.sku}</td>
                      <td>{p.category || "—"}</td>
                      <td>₹{Number(p.unit_price).toFixed(2)}</td>
                      <td>
                        {p.current_stock}
                        {isLow && <span className="badge badge-danger" style={{ marginLeft: 8 }}>Low</span>}
                      </td>
                      <td>{p.location || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        {canManage && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => openStockModal(p)}>Stock</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(p)}>Edit</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-secondary)" }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {/* Add/Edit product modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 18 }}>{editingId ? "Edit Product" : "Add Product"}</h3>
              {formError && <div className="error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

              <div className="field">
                <label className="label">Product Name *</label>
                <input className="input" value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label className="label">SKU / Code *</label>
                  <input className="input" value={form.sku} disabled={!!editingId}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Category</label>
                  <input className="input" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label className="label">Unit Price (₹)</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">
                    {editingId ? "Current Stock (view stock tab to adjust)" : "Opening Stock"}
                  </label>
                  <input className="input" type="number" min="0" value={form.current_stock}
                    disabled={!!editingId}
                    onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label className="label">Min Stock Alert Qty</label>
                  <input className="input" type="number" min="0" value={form.min_stock_alert_qty}
                    onChange={(e) => setForm({ ...form, min_stock_alert_qty: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Location / Warehouse</label>
                  <input className="input" value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock movement modal */}
      {stockModalProduct && (
        <div className="modal-overlay" onClick={() => setStockModalProduct(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 4 }}>Stock Movement</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18 }}>
                {stockModalProduct.product_name} • Current stock: <strong>{stockModalProduct.current_stock}</strong>
              </p>

              {movementError && <div className="error-banner" style={{ marginBottom: 16 }}>{movementError}</div>}

              <div className="field">
                <label className="label">Movement Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className={`btn ${movementType === "IN" ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1 }}
                    onClick={() => setMovementType("IN")}
                  >
                    Stock IN
                  </button>
                  <button
                    className={`btn ${movementType === "OUT" ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1 }}
                    onClick={() => setMovementType("OUT")}
                  >
                    Stock OUT
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="label">Quantity</label>
                <input className="input" type="number" min="1" value={movementQty}
                  onChange={(e) => setMovementQty(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Reason</label>
                <input className="input" value={movementReason}
                  placeholder="e.g. New purchase order, damaged goods, manual correction"
                  onChange={(e) => setMovementReason(e.target.value)} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setStockModalProduct(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleStockMovement} disabled={savingMovement}>
                  {savingMovement ? "Saving..." : "Confirm Movement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}