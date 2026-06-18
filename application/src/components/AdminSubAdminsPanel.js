// src/components/AdminSubAdminsPanel.js — asa- namespace
import React, { useState, useEffect, useCallback } from "react";
import {
  FaUsersCog, FaCheckCircle, FaBan, FaUserClock, FaUserPlus, FaEye, FaEdit, FaTrash,
  FaTimes, FaLock, FaUser, FaGavel, FaFolder, FaCreditCard, FaHeadset, FaCog, FaHistory,
} from "react-icons/fa";
import api from "../api/axios";
import { PERMISSION_CATALOG, PERMISSION_CATEGORY_KEYS, countPermissions } from "../constants/permissions";
import "./AdminSubAdminsPanel.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const CATEGORY_ICONS = {
  users: FaUser, mediators: FaGavel, cases: FaFolder,
  payments: FaCreditCard, support: FaHeadset, settings: FaCog,
};

const ACTION_LABELS = {
  created:              "Sub-admin account created",
  permissions_updated:  "Permissions updated",
  disabled:             "Account disabled",
  enabled:              "Account enabled",
  login:                "System Login",
  profile_updated:      "Profile updated",
};

const emptyPermissions = () =>
  PERMISSION_CATEGORY_KEYS.reduce((acc, k) => ({ ...acc, [k]: [] }), {});

/* ════════════════════════════════════════════════════════
   STAT CARDS
════════════════════════════════════════════════════════ */
const StatCards = ({ stats }) => (
  <div className="asa-stat-grid">
    <div className="asa-stat-card">
      <div className="asa-stat-top">
        <span className="asa-stat-icon asa-stat-icon--blue"><FaUsersCog /></span>
      </div>
      <p className="asa-stat-label">TOTAL SUB ADMINS</p>
      <p className="asa-stat-value">{stats.totalSubAdmins}</p>
    </div>
    <div className="asa-stat-card">
      <div className="asa-stat-top">
        <span className="asa-stat-icon asa-stat-icon--green"><FaCheckCircle /></span>
        <span className="asa-stat-pct">{stats.totalSubAdmins ? Math.round((stats.active / stats.totalSubAdmins) * 100) : 0}% ratio</span>
      </div>
      <p className="asa-stat-label">ACTIVE</p>
      <p className="asa-stat-value">{stats.active}</p>
    </div>
    <div className="asa-stat-card">
      <div className="asa-stat-top">
        <span className="asa-stat-icon asa-stat-icon--red"><FaBan /></span>
      </div>
      <p className="asa-stat-label">INACTIVE</p>
      <p className="asa-stat-value">{stats.inactive}</p>
    </div>
    <div className="asa-stat-card">
      <div className="asa-stat-top">
        <span className="asa-stat-icon asa-stat-icon--purple"><FaUserClock /></span>
        <span className="asa-stat-pct">This month</span>
      </div>
      <p className="asa-stat-label">RECENTLY ADDED</p>
      <p className="asa-stat-value">{stats.recentlyAdded}</p>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   SECURITY VERIFICATION MODAL
════════════════════════════════════════════════════════ */
const SecurityVerifyModal = ({ onCancel, onVerified }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!password) { setError("Enter your password"); return; }
    setVerifying(true); setError("");
    try {
      await api.post("/admin/profile/verify-password", { password });
      onVerified();
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect password");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="asa-modal-overlay" onClick={onCancel}>
      <div className="asa-verify-modal" onClick={(e) => e.stopPropagation()}>
        <div className="asa-verify-icon"><FaLock /></div>
        <h3 className="asa-verify-title">Security Verification</h3>
        <p className="asa-verify-sub">
          Please enter your administrator password to proceed with creating a new sub-admin account.
        </p>
        <label className="asa-field-label">Admin Password</label>
        <div className="asa-pw-wrap">
          <FaLock className="asa-pw-icon" />
          <input
            type="password"
            className="asa-input asa-input--pw"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            autoFocus
          />
        </div>
        {error && <p className="asa-error">{error}</p>}
        <a className="asa-forgot-link" href="/forgotpassword">Forgot Password?</a>
        <div className="asa-verify-actions">
          <button className="asa-btn-secondary" onClick={onCancel} disabled={verifying}>Cancel</button>
          <button className="asa-btn-primary" onClick={handleVerify} disabled={verifying}>
            {verifying ? "Verifying…" : "Verify & Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   PERMISSION GRID (shared between Create modal + Edit mode)
════════════════════════════════════════════════════════ */
const PermissionGrid = ({ permissions, onToggle, asCheckbox = true }) => (
  <div className="asa-perm-grid">
    {PERMISSION_CATEGORY_KEYS.map((catKey) => {
      const cat = PERMISSION_CATALOG[catKey];
      const Icon = CATEGORY_ICONS[catKey];
      return (
        <div key={catKey} className="asa-perm-card">
          <div className="asa-perm-card-head">
            <Icon className="asa-perm-card-icon" />
            <span>{cat.label}</span>
          </div>
          {cat.options.map((opt) => {
            const checked = permissions[catKey]?.includes(opt.key);
            return asCheckbox ? (
              <label key={opt.key} className="asa-checkbox-row">
                <input type="checkbox" checked={!!checked} onChange={() => onToggle(catKey, opt.key)} />
                <span>{opt.label}</span>
              </label>
            ) : (
              <button
                key={opt.key}
                className={`asa-perm-chip ${checked ? "asa-perm-chip--on" : ""}`}
                onClick={() => onToggle(catKey, opt.key)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    })}
  </div>
);

/* ════════════════════════════════════════════════════════
   CREATE SUB ADMIN MODAL
════════════════════════════════════════════════════════ */
const CreateSubAdminModal = ({ onCancel, onCreated }) => {
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", confirmPassword: "", team: "" });
  const [permissions, setPermissions] = useState(emptyPermissions());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const togglePerm = (cat, key) =>
    setPermissions((p) => {
      const set = new Set(p[cat]);
      set.has(key) ? set.delete(key) : set.add(key);
      return { ...p, [cat]: [...set] };
    });

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.username.trim()) e.username = "Username is required";
    else if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim())) e.username = "3-30 chars, letters/numbers/_/. only";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (countPermissions(permissions) === 0) e.permissions = "Select at least one permission";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true); setApiError("");
    try {
      await api.post("/admin/sub-admins", { ...form, permissions });
      onCreated();
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to create sub-admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="asa-modal-overlay" onClick={onCancel}>
      <div className="asa-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="asa-create-head">
          <div>
            <h3 className="asa-create-title">Create Sub Admin</h3>
            <p className="asa-create-sub">Onboard a new administrative member with granular access controls.</p>
          </div>
          <button className="asa-close-btn" onClick={onCancel} aria-label="Close"><FaTimes /></button>
        </div>

        <div className="asa-create-body">
          <h4 className="asa-section-title"><FaUser /> Basic Information</h4>
          <div className="asa-form-grid">
            <div>
              <label className="asa-field-label">Full Name</label>
              <input className={`asa-input ${errors.fullName ? "asa-input--err" : ""}`} placeholder="e.g. Sarah Jenkins"
                value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
              {errors.fullName && <p className="asa-error">{errors.fullName}</p>}
            </div>
            <div>
              <label className="asa-field-label">Username</label>
              <input className={`asa-input ${errors.username ? "asa-input--err" : ""}`} placeholder="@sjenkins_rm"
                value={form.username} onChange={(e) => setField("username", e.target.value)} />
              {errors.username && <p className="asa-error">{errors.username}</p>}
            </div>
            <div className="asa-form-grid-full">
              <label className="asa-field-label">Email Address</label>
              <input className={`asa-input ${errors.email ? "asa-input--err" : ""}`} placeholder="sarah.j@raazimarzi.com"
                value={form.email} onChange={(e) => setField("email", e.target.value)} />
              {errors.email && <p className="asa-error">{errors.email}</p>}
            </div>
            <div>
              <label className="asa-field-label">Password</label>
              <input type="password" className={`asa-input ${errors.password ? "asa-input--err" : ""}`}
                value={form.password} onChange={(e) => setField("password", e.target.value)} />
              {errors.password && <p className="asa-error">{errors.password}</p>}
            </div>
            <div>
              <label className="asa-field-label">Confirm Password</label>
              <input type="password" className={`asa-input ${errors.confirmPassword ? "asa-input--err" : ""}`}
                value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} />
              {errors.confirmPassword && <p className="asa-error">{errors.confirmPassword}</p>}
            </div>
            <div className="asa-form-grid-full">
              <label className="asa-field-label">Team Label (optional)</label>
              <input className="asa-input" placeholder="e.g. Operations Team"
                value={form.team} onChange={(e) => setField("team", e.target.value)} />
            </div>
          </div>

          <h4 className="asa-section-title"><FaLock /> Permission Management</h4>
          <PermissionGrid permissions={permissions} onToggle={togglePerm} asCheckbox />
          {errors.permissions && <p className="asa-error">{errors.permissions}</p>}
          {apiError && <p className="asa-error">{apiError}</p>}
        </div>

        <div className="asa-create-footer">
          <button className="asa-btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button className="asa-btn-primary" onClick={handleSubmit} disabled={submitting}>
            <FaUserPlus /> {submitting ? "Creating…" : "Create Sub Admin"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   SUB ADMIN DETAIL VIEW
════════════════════════════════════════════════════════ */
const SubAdminDetail = ({ id, onBack, startEditing }) => {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(!!startEditing);
  const [draftPermissions, setDraftPermissions] = useState(emptyPermissions());
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/admin/sub-admins/${id}`);
      setData(res.data.subAdmin);
      setActivity(res.data.activity);
      setDraftPermissions(res.data.subAdmin.permissions || emptyPermissions());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sub-admin");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const toggleDraft = (cat, key) =>
    setDraftPermissions((p) => {
      const set = new Set(p[cat] || []);
      set.has(key) ? set.delete(key) : set.add(key);
      return { ...p, [cat]: [...set] };
    });

  const savePermissions = async () => {
    setSaving(true); setActionError("");
    try {
      await api.patch(`/admin/sub-admins/${id}/permissions`, { permissions: draftPermissions });
      setEditing(false);
      fetchDetail();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!window.confirm(`${data.isActive ? "Disable" : "Enable"} this sub-admin account?`)) return;
    setTogglingStatus(true); setActionError("");
    try {
      await api.patch(`/admin/sub-admins/${id}/status`, { isActive: !data.isActive });
      fetchDetail();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update account status");
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) return <div className="asa-loading">Loading sub-admin…</div>;
  if (error) return <div className="asa-error-block">{error}</div>;
  if (!data) return null;

  return (
    <div className="asa-detail">
      <button className="asa-back-link" onClick={onBack}>&larr; Back to Sub Admins</button>

      <div className="asa-detail-header">
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=5b21b6&color=fff&size=80`}
          alt={data.name}
          className="asa-detail-avatar"
        />
        <div className="asa-detail-header-info">
          <h3>{data.name} <span className={`asa-chip ${data.isActive ? "asa-chip--active" : "asa-chip--inactive"}`}>{data.isActive ? "ACTIVE" : "INACTIVE"}</span></h3>
          <p>Sub-Admin &bull; {data.team || "Operations Team"}</p>
        </div>
        <div className="asa-detail-actions">
          <button className="asa-btn-secondary" onClick={() => setEditing((e) => !e)}>
            <FaEdit /> {editing ? "Cancel Editing" : "Edit Permissions"}
          </button>
          <button className="asa-btn-danger" onClick={toggleStatus} disabled={togglingStatus}>
            <FaBan /> {togglingStatus ? "Updating…" : data.isActive ? "Disable Account" : "Enable Account"}
          </button>
        </div>
      </div>

      {actionError && <p className="asa-error">{actionError}</p>}

      <div className="asa-detail-grid">
        <div className="asa-detail-left">
          <div className="asa-right-card">
            <h4 className="asa-section-title">Account Information</h4>
            <div className="asa-info-grid">
              <div><p className="asa-info-label">Username</p><p className="asa-info-value">{data.username}</p></div>
              <div><p className="asa-info-label">Date Created</p><p className="asa-info-value">{fmtDate(data.createdAt)}</p></div>
              <div><p className="asa-info-label">Email Address</p><p className="asa-info-value">{data.email}</p></div>
              <div><p className="asa-info-label">Last Login</p><p className="asa-info-value">{fmtDateTime(data.lastLoginAt)}</p></div>
              <div><p className="asa-info-label">Phone Number</p><p className="asa-info-value">{data.phone || "Not set"}</p></div>
              <div><p className="asa-info-label">Login Method</p><p className="asa-info-value">{data.twoFactorEnabled ? "Multi-Factor Authenticated" : "Password Only"}</p></div>
            </div>
          </div>

          <div className="asa-right-card">
            <div className="asa-right-card-head">
              <h4 className="asa-section-title">Assigned Permissions</h4>
              <span className="asa-total-rules">{countPermissions(editing ? draftPermissions : data.permissions)} Total Rules</span>
            </div>
            <PermissionGrid
              permissions={editing ? draftPermissions : (data.permissions || {})}
              onToggle={editing ? toggleDraft : () => {}}
              asCheckbox={false}
            />
            {editing && (
              <div className="asa-edit-actions">
                <button className="asa-btn-secondary" onClick={() => { setEditing(false); setDraftPermissions(data.permissions); }} disabled={saving}>Cancel</button>
                <button className="asa-btn-primary" onClick={savePermissions} disabled={saving}>{saving ? "Saving…" : "Save Permissions"}</button>
              </div>
            )}
          </div>
        </div>

        <div className="asa-right-card asa-activity-card">
          <div className="asa-right-card-head">
            <h4 className="asa-section-title">Recent Activity Log</h4>
            <FaHistory className="asa-shield-icon" />
          </div>
          {activity.length === 0 ? (
            <p className="asa-empty">No activity recorded yet.</p>
          ) : (
            <div className="asa-activity-list">
              {activity.map((a) => (
                <div key={a._id} className="asa-activity-item">
                  <span className="asa-activity-dot" />
                  <div>
                    <p className="asa-activity-time">{fmtDateTime(a.createdAt)}</p>
                    <p className="asa-activity-desc"><strong>{ACTION_LABELS[a.action] || a.action}</strong></p>
                    <p className="asa-activity-meta">{a.description} · by {a.actorName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MAIN PANEL (list <-> detail)
════════════════════════════════════════════════════════ */
const AdminSubAdminsPanel = () => {
  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [startEditing, setStartEditing] = useState(false);

  const [subAdmins, setSubAdmins] = useState([]);
  const [stats, setStats] = useState({ totalSubAdmins: 0, active: 0, inactive: 0, recentlyAdded: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/admin/sub-admins", { params: { page, limit: 10 } });
      setSubAdmins(res.data.subAdmins);
      setStats(res.data.stats);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sub-admins");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { if (view === "list") fetchList(); }, [view, fetchList]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleVerified = () => { setVerifyOpen(false); setCreateOpen(true); };
  const handleCreated = () => { setCreateOpen(false); setToast({ type: "success", message: "Sub-admin created successfully" }); fetchList(); };

  const openDetail = (id, edit = false) => { setSelectedId(id); setStartEditing(edit); setView("detail"); };
  const backToList = () => { setView("list"); setSelectedId(null); setStartEditing(false); };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently remove this sub-admin account? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/sub-admins/${id}`);
      setToast({ type: "success", message: "Sub-admin removed" });
      fetchList();
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.message || "Failed to remove sub-admin" });
    }
  };

  if (view === "detail") {
    return <SubAdminDetail id={selectedId} onBack={backToList} startEditing={startEditing} />;
  }

  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to = Math.min(page * 10, total);

  return (
    <div className="asa-panel">
      {toast && <div className={`asa-toast asa-toast--${toast.type}`}>{toast.message}</div>}

      <StatCards stats={stats} />

      <div className="asa-right-card">
        <div className="asa-table-head">
          <div>
            <h4 className="asa-section-title">Sub Admin Management</h4>
            <p className="asa-card-sub">Configure access levels and roles for your support and operations team.</p>
          </div>
          <button className="asa-btn-primary" onClick={() => setVerifyOpen(true)}>
            <FaUserPlus /> Create Sub Admin
          </button>
        </div>

        {loading ? (
          <div className="asa-loading">Loading sub-admins…</div>
        ) : error ? (
          <div className="asa-error-block">{error}</div>
        ) : subAdmins.length === 0 ? (
          <p className="asa-empty">No sub-admins yet. Click "Create Sub Admin" to add your first team member.</p>
        ) : (
          <>
            <div className="asa-table-wrap">
              <table className="asa-table">
                <thead>
                  <tr>
                    <th>NAME</th><th>USERNAME</th><th>EMAIL</th><th>PERMISSIONS</th>
                    <th>CREATED ON</th><th>STATUS</th><th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {subAdmins.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <div className="asa-name-cell">
                          <span className="asa-avatar-initials">{s.initials}</span>
                          <strong>{s.name}</strong>
                        </div>
                      </td>
                      <td>{s.username}</td>
                      <td>{s.email}</td>
                      <td><span className="asa-perm-count-chip">{s.permissionsCount} Permissions</span></td>
                      <td>{fmtDate(s.createdAt)}</td>
                      <td><span className={`asa-chip ${s.isActive ? "asa-chip--active" : "asa-chip--inactive"}`}>{s.isActive ? "Active" : "Inactive"}</span></td>
                      <td>
                        <div className="asa-row-actions">
                          <button title="View" onClick={() => openDetail(s._id)}><FaEye /></button>
                          <button title="Edit Permissions" onClick={() => openDetail(s._id, true)}><FaEdit /></button>
                          <button title="Delete" onClick={() => handleDelete(s._id)}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="asa-table-footer">
              <span>Showing {from}-{to} of {total} sub-admins</span>
              <div className="asa-pagination">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5).map((n) => (
                  <button key={n} className={n === page ? "asa-page-active" : ""} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {verifyOpen && <SecurityVerifyModal onCancel={() => setVerifyOpen(false)} onVerified={handleVerified} />}
      {createOpen && <CreateSubAdminModal onCancel={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
};

export default AdminSubAdminsPanel;
