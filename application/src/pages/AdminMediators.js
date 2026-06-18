// src/pages/AdminMediators.js — amm- namespace
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaFilter, FaDownload,
  FaEye, FaUserTie, FaCheckCircle, FaClock, FaBriefcase,
  FaChevronLeft, FaChevronRight, FaTimes,
} from "react-icons/fa";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import AdminAssignCaseModal from "../components/AdminAssignCaseModal";
import "./AdminMediators.css";

/* ── Helpers ─────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const APPROVAL_META = {
  approved: { label: "Approved",       dot: "#22c55e" },
  pending:  { label: "Pending Review", dot: "#f59e0b" },
  rejected: { label: "Rejected",       dot: "#ef4444" },
};

/* ── Filter constants ────────────────────────────────── */
const APPROVAL_OPTIONS  = ["all", "approved", "pending", "rejected"];
const APPROVAL_LABELS   = { all: "All", approved: "Approved", pending: "Pending Review", rejected: "Rejected" };
const DATE_RANGES       = ["Today", "Last 7 Days", "Last 30 Days", "Custom Range"];
const CASE_BUCKETS      = ["0–5 Cases", "6–10 Cases", "11–25 Cases", "25+ Cases"];
const EXPERTISE_OPTIONS = ["Individual Disputes", "Consumer Disputes", "Commercial Disputes"];
const ACTIVE_BUCKETS    = ["No Active Cases", "1–5 Active Cases", "6–10 Active Cases", "10+ Active Cases"];

const caseInBucket = (n, b) => {
  if (b === "0–5 Cases")    return n >= 0  && n <= 5;
  if (b === "6–10 Cases")   return n >= 6  && n <= 10;
  if (b === "11–25 Cases")  return n >= 11 && n <= 25;
  if (b === "25+ Cases")    return n > 25;
  return true;
};
const activeInBucket = (n, b) => {
  if (b === "No Active Cases")    return n === 0;
  if (b === "1–5 Active Cases")   return n >= 1 && n <= 5;
  if (b === "6–10 Active Cases")  return n >= 6 && n <= 10;
  if (b === "10+ Active Cases")   return n > 10;
  return true;
};

/* ── Stat card ───────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="amm-stat-card">
    <div className="amm-stat-icon" style={{ background: accent }}>
      <Icon />
    </div>
    <div className="amm-stat-body">
      <p className="amm-stat-label">{label}</p>
      <p className="amm-stat-value">{value}</p>
      {sub && <p className="amm-stat-sub">{sub}</p>}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
const AdminMediators = () => {
  const navigate = useNavigate();

  /* Data state */
  const [mediators,     setMediators]     = useState([]);
  const [stats,         setStats]         = useState({ totalMediators: 0, activeMediators: 0, pendingApproval: 0, totalActiveCases: 0 });
  const [mediatorGrowth, setMediatorGrowth] = useState([]);
  const [topMediators,  setTopMediators]  = useState([]);
  const [total,         setTotal]         = useState(0);
  const [pages,         setPages]         = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  /* Pagination / search */
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");

  /* Applied filter state */
  const [approvalStatus, setApprovalStatus] = useState("all");
  const [dateRange,      setDateRange]      = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [expertiseSel,   setExpertiseSel]   = useState([]);
  const [caseBuckets,    setCaseBuckets]    = useState([]);
  const [activeBuckets,  setActiveBuckets]  = useState([]);

  /* Pending (staging) filter state */
  const [filterOpen,       setFilterOpen]       = useState(false);
  const [pendingApproval,  setPendingApproval]  = useState("all");
  const [pendingDate,      setPendingDate]       = useState("");
  const [pendingFrom,      setPendingFrom]       = useState("");
  const [pendingTo,        setPendingTo]         = useState("");
  const [pendingExpertise, setPendingExpertise]  = useState([]);
  const [pendingCaseBkt,   setPendingCaseBkt]    = useState([]);
  const [pendingActiveBkt, setPendingActiveBkt]  = useState([]);

  /* Assign modal state */
  const [assignTarget, setAssignTarget] = useState(null);
  const [toast,        setToast]        = useState(null);

  const filterRef = useRef(null);
  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit: 10, search };
      if (approvalStatus !== "all") params.approvalStatus = approvalStatus;
      if (expertiseSel.length > 0)  params.expertise = expertiseSel.join(",");
      if (dateRange === "Today") {
        const t = new Date().toISOString().slice(0, 10);
        params.dateFrom = t; params.dateTo = t;
      } else if (dateRange === "Last 7 Days") {
        params.dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      } else if (dateRange === "Last 30 Days") {
        params.dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      } else if (dateRange === "Custom Range") {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo)   params.dateTo   = dateTo;
      }
      const res = await api.get("/admin/mediators", { params });
      const d   = res.data;
      setStats(d.stats);
      setMediators(d.mediators);
      setTotal(d.total);
      setPages(d.pages);
      setMediatorGrowth(d.mediatorGrowth);
      setTopMediators(d.topMediators);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load mediators.");
    } finally {
      setLoading(false);
    }
  }, [page, search, approvalStatus, expertiseSel, dateRange, dateFrom, dateTo]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchData();
  }, [navigate, fetchData]);

  /* Outside click closes filter */
  useEffect(() => {
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Client-side bucket filter ── */
  const visibleMediators = mediators.filter((m) => {
    if (caseBuckets.length > 0   && !caseBuckets.some((b)   => caseInBucket(m.totalCases, b)))   return false;
    if (activeBuckets.length > 0 && !activeBuckets.some((b) => activeInBucket(m.activeCases, b))) return false;
    return true;
  });

  /* ── Filter actions ── */
  const openFilters = () => {
    setPendingApproval(approvalStatus); setPendingDate(dateRange);
    setPendingFrom(dateFrom); setPendingTo(dateTo);
    setPendingExpertise([...expertiseSel]);
    setPendingCaseBkt([...caseBuckets]); setPendingActiveBkt([...activeBuckets]);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setApprovalStatus(pendingApproval); setDateRange(pendingDate);
    setDateFrom(pendingFrom); setDateTo(pendingTo);
    setExpertiseSel([...pendingExpertise]);
    setCaseBuckets([...pendingCaseBkt]); setActiveBuckets([...pendingActiveBkt]);
    setPage(1); setFilterOpen(false);
  };

  const clearAll = () => {
    setPendingApproval("all"); setPendingDate(""); setPendingFrom(""); setPendingTo("");
    setPendingExpertise([]); setPendingCaseBkt([]); setPendingActiveBkt([]);
  };

  const toggleArr = (setFn, val) =>
    setFn((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]);

  const hasActiveFilters =
    approvalStatus !== "all" || dateRange || expertiseSel.length > 0 ||
    caseBuckets.length > 0  || activeBuckets.length > 0;

  /* ── CSV export ── */
  const exportCSV = () => {
    const headers = ["Name", "Email", "Mediator ID", "Joined", "Total Cases", "Active Cases", "Success Rate", "Approval"];
    const rows = visibleMediators.map((m) => [
      m.name, m.email, m.displayId, fmtDate(m.createdAt),
      m.totalCases, m.activeCases, `${m.successRate}%`,
      APPROVAL_META[m.approvalStatus]?.label || m.approvalStatus,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "admin-mediators.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  /* ── Assign modal ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAssigned = ({ mediatorName, caseId }) => {
    setAssignTarget(null);
    showToast(`${mediatorName} is now the lead mediator for #${caseId}.`);
    fetchData();
  };

  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to   = Math.min(page * 10, total);
  const maxResolved = topMediators[0]?.resolvedCases || 1;

  return (
    <div className="amm-root">
      <AdminSidebar />
      <div className="amm-main">

        {/* Topbar */}
        <header className="amm-topbar">
          <form className="amm-search" onSubmit={handleSearch}>
            <FaSearch className="amm-search-icon" />
            <input
              className="amm-search-input"
              placeholder="Search mediators by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <div className="amm-topbar-right">
            <button className="amm-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="amm-admin-avatar" />
          </div>
        </header>

        <div className="amm-body">

          {/* Page heading */}
          <div className="amm-page-head">
            <div>
              <h2 className="amm-page-title">Mediators</h2>
              <p className="amm-page-sub">Manage mediators, monitor case assignments, and track platform activity</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="amm-stats-row">
            <StatCard icon={FaUserTie}     label="TOTAL MEDIATORS"   value={stats.totalMediators}   accent="rgba(119,138,255,0.12)" />
            <StatCard icon={FaCheckCircle} label="ACTIVE MEDIATORS"  value={stats.activeMediators}  accent="rgba(16,185,129,0.10)"  sub={stats.totalMediators > 0 ? `${Math.round((stats.activeMediators / stats.totalMediators) * 100)}% Active` : null} />
            <StatCard icon={FaClock}       label="PENDING APPROVAL"  value={stats.pendingApproval}  accent="rgba(251,191,36,0.12)"  sub="Awaiting review" />
            <StatCard icon={FaBriefcase}   label="ACTIVE CASES"      value={stats.totalActiveCases} accent="rgba(119,138,255,0.08)" sub="In progress" />
          </div>

          {/* Error */}
          {error && (
            <div className="amm-error">
              <span>{error}</span>
              <button onClick={fetchData}>Retry</button>
            </div>
          )}

          {/* Table card */}
          <div className="amm-table-card">
            <div className="amm-table-head">
              <h3 className="amm-table-title">All Mediators</h3>
              <div className="amm-table-actions">
                <button className="amm-csv-btn" onClick={exportCSV} title="Export current page as CSV">
                  <FaDownload /> Export CSV
                </button>
                <div className="amm-filter-wrap" ref={filterRef}>
                  <button
                    className={`amm-filter-btn ${filterOpen ? "amm-filter-btn--open" : ""}`}
                    onClick={openFilters}
                  >
                    <FaFilter /> Filters
                    {hasActiveFilters && <span className="amm-filter-dot" />}
                  </button>

                  {filterOpen && (
                    <div className="amm-filter-panel">
                      <div className="amm-fp-head">
                        <span className="amm-fp-title">ACTIVE FILTERS</span>
                        <button className="amm-fp-clearall" onClick={clearAll}>Clear All</button>
                      </div>

                      {/* Approval Status */}
                      <div className="amm-fp-section">
                        <p className="amm-fp-label">Approval Status</p>
                        {APPROVAL_OPTIONS.map((opt) => (
                          <label key={opt} className="amm-fp-radio">
                            <input
                              type="radio" name="approval"
                              checked={pendingApproval === opt}
                              onChange={() => setPendingApproval(opt)}
                            />
                            <span>{APPROVAL_LABELS[opt]}</span>
                          </label>
                        ))}
                      </div>

                      {/* Registration Date */}
                      <div className="amm-fp-section">
                        <p className="amm-fp-label">Registration Date</p>
                        {DATE_RANGES.map((dr) => (
                          <label key={dr} className="amm-fp-check">
                            <input
                              type="checkbox"
                              checked={pendingDate === dr}
                              onChange={() => setPendingDate(pendingDate === dr ? "" : dr)}
                            />
                            <span>{dr}</span>
                          </label>
                        ))}
                        {pendingDate === "Custom Range" && (
                          <div className="amm-fp-custom-dates">
                            <input type="date" className="amm-fp-date" value={pendingFrom}
                              onChange={(e) => setPendingFrom(e.target.value)} />
                            <span>—</span>
                            <input type="date" className="amm-fp-date" value={pendingTo}
                              onChange={(e) => setPendingTo(e.target.value)} />
                          </div>
                        )}
                      </div>

                      {/* Cases Involved */}
                      <div className="amm-fp-section">
                        <p className="amm-fp-label">Cases Involved</p>
                        {CASE_BUCKETS.map((b) => (
                          <label key={b} className="amm-fp-check">
                            <input type="checkbox"
                              checked={pendingCaseBkt.includes(b)}
                              onChange={() => toggleArr(setPendingCaseBkt, b)}
                            />
                            <span>{b}</span>
                          </label>
                        ))}
                        <p className="amm-fp-page-note">Applies to current page only.</p>
                      </div>

                      {/* Expertise */}
                      <div className="amm-fp-section">
                        <p className="amm-fp-label">Expertise</p>
                        {EXPERTISE_OPTIONS.map((e) => (
                          <label key={e} className="amm-fp-check">
                            <input type="checkbox"
                              checked={pendingExpertise.includes(e)}
                              onChange={() => toggleArr(setPendingExpertise, e)}
                            />
                            <span>{e}</span>
                          </label>
                        ))}
                      </div>

                      {/* Active Cases */}
                      <div className="amm-fp-section">
                        <p className="amm-fp-label">Active Cases</p>
                        {ACTIVE_BUCKETS.map((b) => (
                          <label key={b} className="amm-fp-check">
                            <input type="checkbox"
                              checked={pendingActiveBkt.includes(b)}
                              onChange={() => toggleArr(setPendingActiveBkt, b)}
                            />
                            <span>{b}</span>
                          </label>
                        ))}
                        <p className="amm-fp-page-note">Applies to current page only.</p>
                      </div>

                      <button className="amm-fp-apply" onClick={applyFilters}>Apply Filters</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="amm-table-loading">Loading mediators…</div>
            ) : (
              <>
                <table className="amm-table">
                  <thead>
                    <tr>
                      <th>MEDIATOR</th>
                      <th>MEDIATOR ID</th>
                      <th>JOINED ON</th>
                      <th>CASES INVOLVED</th>
                      <th>ACTIVE CASES</th>
                      <th>APPROVAL STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMediators.length === 0 ? (
                      <tr><td colSpan={7} className="amm-table-empty">No mediators found.</td></tr>
                    ) : visibleMediators.map((m) => {
                      const meta = APPROVAL_META[m.approvalStatus] || APPROVAL_META.pending;
                      return (
                        <tr key={m._id} className="amm-table-row">
                          <td>
                            <div className="amm-user-cell">
                              {m.avatar
                                ? <img src={m.avatar} alt={m.name} className="amm-user-av" />
                                : <div className="amm-user-av amm-user-av--init">{initials(m.name)}</div>
                              }
                              <div>
                                <p className="amm-user-name">{m.name}</p>
                                <p className="amm-user-email">{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="amm-cell-id">{m.displayId}</td>
                          <td className="amm-cell-date">{fmtDate(m.createdAt)}</td>
                          <td>
                            <span className="amm-count-badge">{m.totalCases}</span>
                          </td>
                          <td>
                            <span className="amm-count-badge amm-count-badge--active">{m.activeCases}</span>
                          </td>
                          <td>
                            <span className="amm-approval-badge">
                              <span className="amm-approval-dot" style={{ background: meta.dot }} />
                              {meta.label}
                            </span>
                          </td>
                          <td>
                            <div className="amm-row-actions">
                              <button
                                className="amm-action-icon-btn"
                                onClick={() => navigate(`/admin/mediators/${m._id}`)}
                                title="View mediator profile"
                              >
                                <FaEye />
                              </button>
                              <button
                                className="amm-assign-row-btn"
                                onClick={() => setAssignTarget(m)}
                                title="Assign a case to this mediator"
                              >
                                Assign Case
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="amm-pagination">
                  <span className="amm-pag-info">
                    Showing {from}–{to} of {total.toLocaleString("en-IN")} mediators
                  </span>
                  <div className="amm-pag-controls">
                    <button className="amm-pag-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <FaChevronLeft /> Previous
                    </button>
                    <button className="amm-pag-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                      Next <FaChevronRight />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Charts row */}
          <div className="amm-charts-row">

            {/* Mediator Growth Trend */}
            <div className="amm-chart-card">
              <div className="amm-chart-head">
                <h3 className="amm-chart-title">Mediator Growth Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mediatorGrowth} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 12 }}
                    labelStyle={{ fontWeight: 700, color: "#374151" }}
                  />
                  <Bar dataKey="mediators" name="New Mediators" fill="rgba(119,138,255,0.75)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Mediators */}
            <div className="amm-chart-card">
              <h3 className="amm-chart-title">Top Mediators (Cases Solved)</h3>
              {topMediators.length === 0 ? (
                <p className="amm-chart-empty">No resolved cases yet.</p>
              ) : (
                <div className="amm-top-list">
                  {topMediators.map((m) => (
                    <div key={m._id} className="amm-top-row">
                      <span className="amm-top-name">{m.name}</span>
                      <div className="amm-top-bar-wrap">
                        <div
                          className="amm-top-bar"
                          style={{ width: `${Math.round((m.resolvedCases / maxResolved) * 100)}%` }}
                        />
                      </div>
                      <span className="amm-top-count">{m.resolvedCases}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Assign Case Modal */}
      {assignTarget && (
        <AdminAssignCaseModal
          mediatorId={assignTarget._id}
          mediatorName={assignTarget.name}
          mediatorAvatar={assignTarget.avatar}
          expertiseAreas={assignTarget.expertiseAreas || []}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssigned}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="amm-toast">
          <FaCheckCircle className="amm-toast-icon" />
          <div>
            <p className="amm-toast-title">Case Assigned Successfully</p>
            <p className="amm-toast-sub">{toast}</p>
          </div>
          <button className="amm-toast-close" onClick={() => setToast(null)}><FaTimes /></button>
        </div>
      )}

    </div>
  );
};

export default AdminMediators;
