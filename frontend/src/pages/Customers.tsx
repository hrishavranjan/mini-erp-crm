import { useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Customer, Pagination } from "../types";

const EMPTY_FORM = {
  customer_name: "",
  mobile_number: "",
  email: "",
  business_name: "",
  gst_number: "",
  customer_type: "Retail" as Customer["customer_type"],
  address: "",
  status: "Lead" as Customer["status"],
  follow_up_date: "",
  notes: "",
};

function statusBadgeClass(status: string) {
  if (status === "Active") return "badge-success";
  if (status === "Lead") return "badge-warning";
  return "badge-neutral";
}

export default function Customers() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "sales";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [followupNote, setFollowupNote] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [savingFollowup, setSavingFollowup] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/customers?${params.toString()}`);
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(c: Customer) {
    setEditingId(c.id);
    setForm({
      customer_name: c.customer_name,
      mobile_number: c.mobile_number,
      email: c.email || "",
      business_name: c.business_name || "",
      gst_number: c.gst_number || "",
      customer_type: c.customer_type,
      address: c.address || "",
      status: c.status,
      follow_up_date: c.follow_up_date || "",
      notes: c.notes || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError("");
    if (!form.customer_name.trim() || !form.mobile_number.trim()) {
      setFormError("Customer name and mobile number are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
      } else {
        await api.post("/customers", form);
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(id: string) {
    try {
      const { data } = await api.get(`/customers/${id}`);
      setDetailCustomer(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAddFollowup() {
    if (!detailCustomer || !followupNote.trim()) return;
    setSavingFollowup(true);
    try {
      await api.post(`/customers/${detailCustomer.id}/followups`, {
        note: followupNote,
        follow_up_date: followupDate || undefined,
      });
      setFollowupNote("");
      setFollowupDate("");
      openDetail(detailCustomer.id);
      fetchCustomers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingFollowup(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>Customers (CRM)</h2>
          <p className="subtitle">Manage leads, active accounts, and follow-ups.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Customer
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search by name, mobile, business, email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ minWidth: 280 }}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="Lead">Lead</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">No customers found. Try adjusting your search or filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <a onClick={() => openDetail(c.id)} style={{ cursor: "pointer", fontWeight: 600 }}>
                        {c.customer_name}
                      </a>
                    </td>
                    <td>{c.mobile_number}</td>
                    <td>{c.business_name || "—"}</td>
                    <td>{c.customer_type}</td>
                    <td><span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span></td>
                    <td>{c.follow_up_date || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetail(c.id)}>View</button>
                      {canManage && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(c)}>Edit</button>
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
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-secondary)" }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 18 }}>{editingId ? "Edit Customer" : "Add Customer"}</h3>

              {formError && <div className="error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

              <div className="field">
                <label className="label">Customer Name *</label>
                <input className="input" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Mobile Number *</label>
                <input className="input" value={form.mobile_number}
                  onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Business Name</label>
                <input className="input" value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">GST Number (optional)</label>
                <input className="input" value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label className="label">Customer Type</label>
                  <select className="select" value={form.customer_type}
                    onChange={(e) => setForm({ ...form, customer_type: e.target.value as any })}>
                    <option>Retail</option>
                    <option>Wholesale</option>
                    <option>Distributor</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Status</label>
                  <select className="select" value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                    <option>Lead</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">Address</label>
                <textarea className="textarea" rows={2} value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Follow-up Date</label>
                <input className="input" type="date" value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Notes</label>
                <textarea className="textarea" rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Customer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailCustomer && (
        <div className="modal-overlay" onClick={() => setDetailCustomer(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3>{detailCustomer.customer_name}</h3>
                  <span className={`badge ${statusBadgeClass(detailCustomer.status)}`} style={{ marginTop: 8 }}>
                    {detailCustomer.status}
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setDetailCustomer(null)}>✕</button>
              </div>

              <div style={{ marginTop: 18, fontSize: 13.5, lineHeight: 1.9 }}>
                <div><strong>Mobile:</strong> {detailCustomer.mobile_number}</div>
                <div><strong>Email:</strong> {detailCustomer.email || "—"}</div>
                <div><strong>Business:</strong> {detailCustomer.business_name || "—"}</div>
                <div><strong>GST:</strong> {detailCustomer.gst_number || "—"}</div>
                <div><strong>Type:</strong> {detailCustomer.customer_type}</div>
                <div><strong>Address:</strong> {detailCustomer.address || "—"}</div>
                <div><strong>Notes:</strong> {detailCustomer.notes || "—"}</div>
              </div>

              <h4 style={{ marginTop: 22, marginBottom: 10, fontSize: 14 }}>Follow-up History</h4>
              <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 14 }}>
                {(detailCustomer.followups || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No follow-ups yet.</p>
                ) : (
                  detailCustomer.followups!.map((f) => (
                    <div key={f.id} className="card" style={{ padding: 10, marginBottom: 8, fontSize: 13 }}>
                      <div>{f.note}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 4 }}>
                        {f.follow_up_date ? `Next: ${f.follow_up_date} • ` : ""}
                        {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canManage && (
                <div>
                  <div className="field">
                    <label className="label">Add follow-up note</label>
                    <textarea className="textarea" rows={2} value={followupNote}
                      onChange={(e) => setFollowupNote(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input className="input" type="date" value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-primary" disabled={savingFollowup || !followupNote.trim()}
                      onClick={handleAddFollowup}>
                      {savingFollowup ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
