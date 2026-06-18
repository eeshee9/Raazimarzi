// src/pages/AdminUserDetails.js — aud- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaArrowLeft, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaDownload, FaBan, FaCheckCircle, FaShieldAlt,
  FaBriefcase, FaRupeeSign, FaTicketAlt, FaChartLine,
  FaEye, FaFilePdf,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminUserDetails.css";

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtINR = (n) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "₹0";
const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const normCaseStatus = (s = "") => {
  const l = (s || "").toLowerCase();
  if (["mediation","arbitration","hearing","in-progress","assigned"].some((k) => l.includes(k))) return { label: "In Mediation", cls: "aud-badge aud-badge--med" };
  if (l === "resolved" || l === "awarded") return { label: "Resolved", cls: "aud-badge aud-badge--resolved" };
  if (l === "closed" || l === "withdrawn") return { label: "Closed",   cls: "aud-badge aud-badge--closed"   };
  if (l === "rejected")                    return { label: "Rejected",  cls: "aud-badge aud-badge--rejected"  };
  return { label: "Pending", cls: "aud-badge aud-badge--pending" };
};

const normTxnStatus = (s = "") => {
  const l = (s || "").toLowerCase();
  if (l === "paid")    return { label: "Success", cls: "aud-badge aud-badge--resolved" };
  if (l === "failed")  return { label: "Failed",  cls: "aud-badge aud-badge--rejected"  };
  return { label: "Pending", cls: "aud-badge aud-badge--pending" };
};

const normTicketStatus = (s = "") => {
  if ((s || "").toLowerCase() === "resolved") return { label: "Resolved", cls: "aud-badge aud-badge--resolved" };
  return { label: "Open", cls: "aud-badge aud-badge--open" };
};

const TABS = ["Cases", "Payments", "Support Tickets"];

/* ── Stat mini-card ──────────────────────────────────────────── */
const MiniStat = ({ icon: Icon, label, value, accent }) => (
  <div className="aud-mini-stat">
    <div className="aud-mini-icon-wrap"><Icon className="aud-mini-icon" /></div>
    <p className="aud-mini-label">{label}</p>
    <p className="aud-mini-value" style={{ color: accent }}>{value}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminUserDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [user,    setUser]    = useState(null);
  const [stats,   setStats]   = useState({ totalCases: 0, totalPayments: 0, activeTickets: 0, settlementRate: 0 });
  const [cases,   setCases]   = useState([]);
  const [txns,    setTxns]    = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tab,     setTab]     = useState("Cases");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [acting,  setActing]  = useState(false);

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/admin/users/${id}/detail`);
      const d   = res.data;
      setUser(d.user);
      setStats(d.stats);
      setCases(d.cases);
      setTxns(d.transactions);
      setTickets(d.tickets);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load user.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchDetail();
  }, [navigate, fetchDetail]);

  const handleDeactivate = async () => {
    if (!user) return;
    const active = user.isActive;
    const verb   = active ? "suspend" : "activate";
    if (!window.confirm(`${active ? "Deactivate" : "Activate"} this user account?`)) return;
    setActing(true);
    try {
      if (active) {
        await api.patch(`/admin/users/${id}/suspend`, { reason: "Deactivated by admin" });
      } else {
        await api.patch(`/admin/users/${id}/activate`);
      }
      await fetchDetail();
    } catch (e) {
      alert(e.response?.data?.message || `Failed to ${verb} user.`);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="aud-root"><AdminSidebar />
        <div className="aud-loading"><div className="aud-spinner" /><p>Loading user…</p></div>
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="aud-root"><AdminSidebar />
        <div className="aud-error-state">
          <p>{error || "User not found."}</p>
          <button onClick={() => navigate("/admin/users")}>Back to Users</button>
        </div>
      </div>
    );
  }

  const location = [user.city, user.state, user.country].filter(Boolean).join(", ") || user.address || "—";
  const kycDate  = user.createdAt ? fmt(user.createdAt) : "—";

  return (
    <div className="aud-root">
      <AdminSidebar />
      <div className="aud-main">

        {/* Topbar */}
        <header className="aud-topbar">
          <div className="aud-search">
            <FaSearch className="aud-search-icon" />
            <input className="aud-search-input" placeholder="Search cases, mediators or meetings…" readOnly />
          </div>
          <div className="aud-topbar-right">
            <button className="aud-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="aud-admin-avatar" />
          </div>
        </header>

        <div className="aud-body">

          {/* Breadcrumb / page title */}
          <div className="aud-page-head">
            <button className="aud-back-btn" onClick={() => navigate("/admin/users")}>
              <FaArrowLeft /> Users
            </button>
            <div>
              <h2 className="aud-page-title">Users</h2>
              <p className="aud-page-sub">Manage and monitor all platform users</p>
            </div>
          </div>

          {/* User header row */}
          <div className="aud-user-header">
            <div className="aud-user-header-left">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="aud-user-avatar" />
                : <div className="aud-user-avatar aud-user-avatar--init">{initials(user.name)}</div>
              }
              <div>
                <h2 className="aud-user-name">{user.name}</h2>
                <p className="aud-user-meta">
                  <span className="aud-user-id">{user.displayId}</span>
                  <span className="aud-dot">•</span>
                  <span>Joined {fmt(user.createdAt)}</span>
                </p>
              </div>
            </div>
            <button
              className="aud-msg-btn"
              disabled
              title="Admin-to-user messaging is not available in this version"
            >
              <FaEnvelope /> Message User
            </button>
          </div>

          {/* Two-column layout */}
          <div className="aud-columns">

            {/* Left column */}
            <div className="aud-left-col">

              {/* Profile Overview */}
              <div className="aud-card">
                <h3 className="aud-card-title">Profile Overview</h3>
                <div className="aud-profile-rows">
                  <div className="aud-profile-row">
                    <div className="aud-profile-icon-wrap"><FaEnvelope className="aud-profile-icon" /></div>
                    <div>
                      <p className="aud-profile-row-label">EMAIL</p>
                      <p className="aud-profile-row-val">{user.email}</p>
                    </div>
                  </div>
                  <div className="aud-profile-row">
                    <div className="aud-profile-icon-wrap"><FaPhone className="aud-profile-icon" /></div>
                    <div>
                      <p className="aud-profile-row-label">PHONE</p>
                      <p className="aud-profile-row-val">{user.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="aud-profile-row">
                    <div className="aud-profile-icon-wrap"><FaMapMarkerAlt className="aud-profile-icon" /></div>
                    <div>
                      <p className="aud-profile-row-label">LOCATION</p>
                      <p className="aud-profile-row-val">{location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Actions */}
              <div className="aud-card">
                <h3 className="aud-card-title">Administrative Actions</h3>
                <button
                  className="aud-action-row"
                  disabled
                  title="Export Full Profile is not available in this version"
                >
                  <FaDownload className="aud-action-icon" />
                  <span>Export Full Profile</span>
                </button>
                <button
                  className={`aud-action-row aud-action-row--danger ${acting ? "aud-action-row--busy" : ""}`}
                  onClick={handleDeactivate}
                  disabled={acting}
                >
                  {user.isActive
                    ? <><FaBan className="aud-action-icon" /><span>{acting ? "Processing…" : "Deactivate Account"}</span></>
                    : <><FaCheckCircle className="aud-action-icon aud-action-icon--green" /><span>{acting ? "Processing…" : "Activate Account"}</span></>
                  }
                </button>
              </div>

              {/* Account Status */}
              <div className="aud-card aud-card--accent">
                <p className="aud-status-heading">ACCOUNT STATUS</p>
                <p className="aud-status-value">{user.isActive ? "Active" : "Suspended"}</p>
                <p className="aud-status-sub">
                  {user.isActive
                    ? `Registered on ${kycDate}`
                    : user.suspendedReason || "Account suspended by admin"
                  }
                </p>
                <FaShieldAlt className="aud-status-shield" />
              </div>

            </div>

            {/* Right column */}
            <div className="aud-right-col">

              {/* Stat cards */}
              <div className="aud-mini-stats-row">
                <MiniStat icon={FaBriefcase}  label="TOTAL CASES"     value={stats.totalCases}        accent="#111827" />
                <MiniStat icon={FaRupeeSign}   label="PAYMENTS"        value={fmtINR(stats.totalPayments)} accent="rgba(119,138,255,1)" />
                <MiniStat icon={FaTicketAlt}   label="ACTIVE TICKETS"  value={String(stats.activeTickets).padStart(2,"0")} accent="#111827" />
                <MiniStat icon={FaChartLine}   label="SETTLEMENT RATE" value={`${stats.settlementRate}%`} accent="#111827" />
              </div>

              {/* Tabs */}
              <div className="aud-tabs-card">
                <div className="aud-tabs-nav">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      className={`aud-tab-btn ${tab === t ? "aud-tab-btn--active" : ""}`}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Cases tab */}
                {tab === "Cases" && (
                  <div className="aud-tab-body">
                    {cases.length === 0 ? (
                      <p className="aud-tab-empty">No cases found for this user.</p>
                    ) : (
                      <table className="aud-table">
                        <thead><tr>
                          <th>CASE ID</th>
                          <th>DISPUTE TYPE</th>
                          <th>STATUS</th>
                          <th>LAST UPDATED</th>
                          <th>ACTIONS</th>
                        </tr></thead>
                        <tbody>
                          {cases.map((c) => {
                            const st = normCaseStatus(c.status);
                            return (
                              <tr key={c._id} className="aud-table-row">
                                <td className="aud-td-id">#{c.caseId || c._id.toString().slice(-4)}</td>
                                <td>{c.caseType || c.caseTitle || "General"}</td>
                                <td><span className={st.cls}>{st.label}</span></td>
                                <td>{fmt(c.updatedAt)}</td>
                                <td>
                                  <button
                                    className="aud-action-btn"
                                    onClick={() => navigate(`/admin/view-details/${c._id}`)}
                                    title="View case"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {cases.length > 0 && (
                      <button
                        className="aud-view-all-btn"
                        onClick={() => navigate("/admin/new-cases")}
                      >
                        Go to All Cases →
                      </button>
                    )}
                  </div>
                )}

                {/* Payments tab */}
                {tab === "Payments" && (
                  <div className="aud-tab-body">
                    {txns.length === 0 ? (
                      <p className="aud-tab-empty">No payments found for this user.</p>
                    ) : (
                      <table className="aud-table">
                        <thead><tr>
                          <th>TRANSACTION ID</th>
                          <th>DATE</th>
                          <th>AMOUNT</th>
                          <th>STATUS</th>
                          <th>ACTION</th>
                        </tr></thead>
                        <tbody>
                          {txns.map((t) => {
                            const st = normTxnStatus(t.status);
                            return (
                              <tr key={t._id} className="aud-table-row">
                                <td className="aud-td-id">#{t.txnId || t._id.toString().slice(-4)}</td>
                                <td>{fmt(t.createdAt)}</td>
                                <td className="aud-td-amount">{fmtINR(t.amount)}</td>
                                <td><span className={st.cls}>{st.label}</span></td>
                                <td>
                                  <button
                                    className="aud-action-btn aud-action-btn--disabled"
                                    disabled
                                    title="Invoice download requires user-level access and is not available to admin here"
                                  >
                                    <FaFilePdf /> Invoice
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {txns.length > 0 && (
                      <p className="aud-view-all-btn aud-view-all-btn--faded">
                        View All Payments →
                      </p>
                    )}
                  </div>
                )}

                {/* Support Tickets tab */}
                {tab === "Support Tickets" && (
                  <div className="aud-tab-body">
                    {tickets.length === 0 ? (
                      <p className="aud-tab-empty">No support tickets found for this user.</p>
                    ) : (
                      <table className="aud-table">
                        <thead><tr>
                          <th>TICKET ID</th>
                          <th>SUBJECT</th>
                          <th>STATUS</th>
                          <th>LAST UPDATED</th>
                          <th>ACTIONS</th>
                        </tr></thead>
                        <tbody>
                          {tickets.map((tk) => {
                            const st = normTicketStatus(tk.status);
                            return (
                              <tr key={tk._id} className="aud-table-row">
                                <td className="aud-td-id">#{tk.ticketId || tk._id.toString().slice(-4)}</td>
                                <td>{tk.subject}</td>
                                <td><span className={st.cls}>{st.label}</span></td>
                                <td>{fmt(tk.updatedAt || tk.createdAt)}</td>
                                <td>
                                  <button
                                    className="aud-action-btn"
                                    onClick={() => navigate(`/admin/support`)}
                                    title="View ticket"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {tickets.length > 0 && (
                      <button
                        className="aud-view-all-btn"
                        onClick={() => navigate("/admin/support")}
                      >
                        View All Support Tickets →
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminUserDetails;
