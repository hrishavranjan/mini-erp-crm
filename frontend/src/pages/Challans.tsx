import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Challan, Pagination } from "../types";

function statusBadgeClass(status: string) {
  if (status === "Confirmed") return "badge-success";
  if (status === "Draft") return "badge-warning";
  return "badge-danger";
}

export default function Challans() {
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "sales";
  const canConfirm = user?.role === "admin" || user?.role === "sales" || user?.role === "warehouse";
  const canCancel = user?.role === "admin" || user?.role === "sales";

  const [searchParams, setSearchParams] = useSearchParams();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchChallans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (status) params.set("status", status);
      const { data } = await api.get(`/challans?${params.toString()}`);
      setChallans(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchChallans(); }, [fetchChallans]);

  async function handleConfirm(id: string) {
    setActionError("");
    setBusyId(id);
    try {
      await api.patch(`/challans/${id}/confirm`);
      fetchChallans();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this challan? If it was confirmed, stock will be restored.")) return;
    setActionError("");
    setBusyId(id);
    try {
      await api.patch(`/challans/${id}/cancel`);
      fetchChallans();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>Sales Challans</h2>
          <p className="subtitle">Create and track dispatch challans against customer orders.</p>
        </div>
        {canCreate && <Link to="/challans/new" className="btn btn-primary">+ New Challan</Link>}
      </div>

      <div className="toolbar">
        <select
          className="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSearchParams(e.target.value ? { status: e.target.value } : {});
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
      {actionError && <div className="error-banner" style={{ marginBottom: 16 }}>{actionError}</div>}

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : challans.length === 0 ? (
          <div className="empty-state">No challans found.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{c.challan_number}</td>
                    <td>{c.customers?.customer_name || "—"}</td>
                    <td>{c.total_quantity}</td>
                    <td><span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: "right" }}>
                      {c.status === "Draft" && canConfirm && (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === c.id}
                          onClick={() => handleConfirm(c.id)}>
                          {busyId === c.id ? "..." : "Confirm"}
                        </button>
                      )}
                      {c.status !== "Cancelled" && canCancel && (
                        <button className="btn btn-ghost btn-sm" disabled={busyId === c.id}
                          onClick={() => handleCancel(c.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}