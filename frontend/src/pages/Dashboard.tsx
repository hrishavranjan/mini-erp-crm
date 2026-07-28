import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    draftChallans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [customersRes, productsRes, lowStockRes, draftRes] = await Promise.all([
          api.get("/customers?limit=1"),
          api.get("/products?limit=1"),
          api.get("/products?limit=100&lowStock=true"),
          api.get("/challans?status=Draft&limit=1"),
        ]);
        setStats({
          customers: customersRes.data.pagination.total,
          products: productsRes.data.pagination.total,
          lowStock: lowStockRes.data.data.length,
          draftChallans: draftRes.data.pagination.total,
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>Welcome back, {user?.name?.split(" ")[0]} 👋</h2>
          <p className="subtitle">Here's a quick snapshot of current operations.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <Link to="/customers" className="card stat-card" style={{ display: "block" }}>
              <div className="stat-label">Total Customers</div>
              <div className="stat-value">{stats.customers}</div>
            </Link>
            <Link to="/products" className="card stat-card" style={{ display: "block" }}>
              <div className="stat-label">Total Products</div>
              <div className="stat-value">{stats.products}</div>
            </Link>
            <Link
              to="/products?lowStock=true"
              className="card stat-card"
              style={{ display: "block" }}
            >
              <div className="stat-label">Low Stock Alerts</div>
              <div className="stat-value" style={{ color: stats.lowStock > 0 ? "var(--danger)" : undefined }}>
                {stats.lowStock}
              </div>
            </Link>
            <Link to="/challans?status=Draft" className="card stat-card" style={{ display: "block" }}>
              <div className="stat-label">Draft Challans</div>
              <div className="stat-value">{stats.draftChallans}</div>
            </Link>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Quick actions</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/customers" className="btn btn-secondary">+ New Customer</Link>
              <Link to="/products" className="btn btn-secondary">+ New Product</Link>
              <Link to="/challans/new" className="btn btn-primary">+ New Sales Challan</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}