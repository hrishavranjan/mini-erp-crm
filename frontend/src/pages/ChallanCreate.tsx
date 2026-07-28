import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api/axios";
import { Customer, Product } from "../types";

interface LineItem {
  product_id: string;
  quantity: string;
}

export default function ChallanCreate() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ product_id: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState<"Draft" | "Confirmed" | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [customersRes, productsRes] = await Promise.all([
          api.get("/customers?limit=100"),
          api.get("/products?limit=100"),
        ]);
        setCustomers(customersRes.data.data);
        setProducts(productsRes.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addLine() {
    setItems((prev) => [...prev, { product_id: "", quantity: "" }]);
  }

  function removeLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productById(id: string) {
    return products.find((p) => p.id === id);
  }

  const total = items.reduce((sum, it) => {
    const p = productById(it.product_id);
    const qty = Number(it.quantity) || 0;
    return sum + (p ? p.unit_price * qty : 0);
  }, 0);

  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  async function handleSubmit(status: "Draft" | "Confirmed") {
    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    const validItems = items.filter((it) => it.product_id && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setError("Add at least one product with a quantity greater than zero.");
      return;
    }

    setSubmitting(status);
    try {
      const { data } = await api.post("/challans", {
        customer_id: customerId,
        status,
        items: validItems.map((it) => ({
          product_id: it.product_id,
          quantity: Number(it.quantity),
        })),
      });
      navigate("/challans", { state: { created: data.data.challan_number } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  if (loadingData) {
    return <div className="page-loading"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>New Sales Challan</h2>
          <p className="subtitle">Select a customer, add products, then save as draft or confirm.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="field">
          <label className="label">Customer *</label>
          <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_name} — {c.mobile_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Products</h3>

        {items.map((item, index) => {
          const product = productById(item.product_id);
          const qty = Number(item.quantity) || 0;
          const insufficient = product && qty > product.current_stock;

          return (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr auto",
                gap: 12,
                alignItems: "start",
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <div>
                <select
                  className="select"
                  value={item.product_id}
                  onChange={(e) => updateItem(index, "product_id", e.target.value)}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.sku}) — Stock: {p.current_stock}
                    </option>
                  ))}
                </select>
                {product && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    ₹{Number(product.unit_price).toFixed(2)} / unit &nbsp;•&nbsp; Available: {product.current_stock}
                  </div>
                )}
              </div>
              <div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  style={{ borderColor: insufficient ? "var(--danger)" : undefined }}
                />
                {insufficient && (
                  <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>
                    Exceeds available stock
                  </div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => removeLine(index)}
                disabled={items.length === 1}
              >
                ✕
              </button>
            </div>
          );
        })}

        <button className="btn btn-secondary btn-sm" onClick={addLine}>+ Add another product</button>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
            Total Quantity: <strong style={{ color: "var(--text-primary)" }}>{totalQty}</strong>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Total: ₹{total.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button
          className="btn btn-secondary"
          disabled={submitting !== null}
          onClick={() => handleSubmit("Draft")}
        >
          {submitting === "Draft" ? "Saving..." : "Save as Draft"}
        </button>
        <button
          className="btn btn-primary"
          disabled={submitting !== null}
          onClick={() => handleSubmit("Confirmed")}
        >
          {submitting === "Confirmed" ? "Confirming..." : "Confirm Challan (reduces stock)"}
        </button>
      </div>
    </div>
  );
}