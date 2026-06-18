// src/pages/AdminSupport.js — asp- namespace
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaFilter, FaDownload,
  FaTicketAlt, FaClock, FaCheckCircle, FaStar,
  FaChevronLeft, FaChevronRight,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminSupport.css";

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "—";

const CATEGORY_LABELS = {
  Account:   "Account Access",
  Technical: "Technical Support",
  Payment:   "Billing & Payments",
  Meeting:   "Meeting Support",
  Case:      "Case Dispute",
};

const STATUS_CFG = {
  open:     { label: "Open",     cls: "asp-badge--open"     },
  resolved: { label: "Resolved", cls: "asp-badge--resolved" },
};

const ROLE_TAG_CFG = {
  user:          { label: "USER",          cls: "asp-role--user"     },
  mediator:      { label: "MEDIATOR",      cls: "asp-role--mediator" },
  arbitrator:    { label: "ARBITRATOR",    cls: "asp-role--mediator" },
  "case-manager":{ label: "CASE MANAGER",  cls: "asp-role--mediator" },
  admin:         { label: "ADMIN",         cls: "asp-role--mediator" },
};

const CATEGORIES = ["Account", "Technical", "Payment", "Meeting", "Case"];

/* ══════════════════════════════════════════════════════════════
   SATISFACTION CARD
══════════════════════════════════════════════════════════════ */
const SatCard = ({ title, data }) => (
  <div className={`asp-sat-card ${!data?.available ? "asp-sat-card--unavailable" : ""}`}>
    <p className="asp-sat-title">{title}</p>
    {data?.available ? (
      <>
        <div className="asp-sat-score-row">
          <FaStar className="asp-sat-star" />
          <span className="asp-sat-avg">{data.avg}</span>
          <span className="asp-sat-slash">/5</span>
          <span className="asp-sat-count">({data.count} reviews)</span>
        </div>
        <p className="asp-sat-dist-label">DISTRIBUTION</p>
        <div className="asp-sat-bars">
          {[5, 4, 3, 2, 1].map((n) => {
            const cnt = data.distribution?.[String(n)] ?? 0;
            const pct = data.count > 0 ? (cnt / data.count) * 100 : 0;
            return (
              <div key={n} className="asp-sat-bar-row">
                <span className="asp-sat-bar-label">{n}</span>
                <div className="asp-sat-bar-track">
                  <div className="asp-sat-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="asp-sat-bar-count">{cnt}</span>
              </div>
            );
          })}
        </div>
      </>
    ) : (
      <p className="asp-sat-empty">
        {title === "CASE CLOSURE FEEDBACK"
          ? "Case closure ratings are not collected yet. This section will populate once case feedback is enabled."
          : "No feedback submitted yet."}
      </p>
    )}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminSupport = () => {
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [tickets,      setTickets]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [pages,        setPages]        = useState(1);
  const [page,         setPage]         = useState(1);
  const [satisfaction, setSatisfaction] = useState(null);

  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");

  /* Filters */
  const [filtersOpen,      setFiltersOpen]      = useState(false);
  const [filterStatus,     setFilterStatus]     = useState("all");
  const [filterCategory,   setFilterCategory]   = useState("all");
  const [pendingStatus,    setPendingStatus]     = useState("all");
  const [pendingCategory,  setPendingCategory]  = useState("all");
  const filterRef = useRef(null);

  const LIMIT = 10;

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar =
    localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT };
      if (search)                     params.search   = search;
      if (filterStatus   !== "all")   params.status   = filterStatus;
      if (filterCategory !== "all")   params.category = filterCategory;

      const res = await api.get("/support/admin/dashboard", { params });
      const d   = res.data;
      setStats(d.stats);
      setTickets(d.tickets || []);
      setTotal(d.total  ?? 0);
      setPages(d.pages  ?? 1);
      setSatisfaction(d.satisfaction || null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load support data.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCategory]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchData();
  }, [navigate, fetchData]);

  /* Close filter panel on outside click */
  useEffect(() => {
    const h = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Filter actions ── */
  const openFiltersPanel = () => {
    setPendingStatus(filterStatus);
    setPendingCategory(filterCategory);
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setFilterStatus(pendingStatus);
    setFilterCategory(pendingCategory);
    setPage(1);
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setPendingStatus("all");
    setPendingCategory("all");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  /* ── CSV export of current page ── */
  const exportCSV = () => {
    if (!tickets.length) return;
    const headers = ["Ticket ID", "Requester", "Requester Role", "Subject", "Category", "Status", "Created On"];
    const rows = tickets.map((t) => [
      t.ticketId,
      t.userId?.name  || "—",
      t.userId?.role  || "—",
      t.subject,
      CATEGORY_LABELS[t.category] || t.category,
      STATUS_CFG[t.status]?.label || t.status,
      fmtDate(t.createdAt),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `support-tickets-p${page}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);
  const hasActiveFilters = filterStatus !== "all" || filterCategory !== "all";

  return (
    <div className="asp-root">
      <AdminSidebar />
      <div className="asp-main">

        {/* Topbar */}
        <header className="asp-topbar">
          <form className="asp-search-form" onSubmit={handleSearch}>
            <FaSearch className="asp-search-icon" />
            <input
              className="asp-search-input"
              placeholder="Search cases, mediators or meetings..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <div className="asp-topbar-right">
            <button className="asp-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="asp-admin-avatar" />
          </div>
        </header>

        <div className="asp-body">

          {/* Page heading */}
          <div className="asp-page-head">
            <h2 className="asp-page-title">Support Ticket Dashboard</h2>
            <p className="asp-page-sub">Manage and resolve mediator and user inquiries across the platform.</p>
          </div>

          {/* KPI cards */}
          {stats && (
            <div className="asp-kpi-row">
              <div className="asp-kpi-card">
                <div className="asp-kpi-icon asp-kpi-icon--ticket">
                  <FaTicketAlt />
                </div>
                <div className="asp-kpi-body">
                  <p className="asp-kpi-badge asp-kpi-badge--up">
                    {stats.openToday > 0 ? `+${stats.openToday} today` : "No new today"}
                  </p>
                  <p className="asp-kpi-label">OPEN TICKETS</p>
                  <p className="asp-kpi-value">{stats.openTickets}</p>
                  <p className="asp-kpi-sub">Requires immediate attention</p>
                </div>
              </div>

              <div className="asp-kpi-card">
                <div className="asp-kpi-icon asp-kpi-icon--clock">
                  <FaClock />
                </div>
                <div className="asp-kpi-body">
                  <p className="asp-kpi-label">AVG. RESOLUTION TIME</p>
                  <p className="asp-kpi-value">{stats.avgResponseTimeLabel}</p>
                  <p className="asp-kpi-sub">
                    {stats.resolvedCount > 0
                      ? `Across ${stats.resolvedCount} resolved tickets`
                      : "No resolved tickets yet"}
                  </p>
                </div>
              </div>

              <div className="asp-kpi-card">
                <div className="asp-kpi-icon asp-kpi-icon--rate">
                  <FaCheckCircle />
                </div>
                <div className="asp-kpi-body">
                  <span className="asp-kpi-badge asp-kpi-badge--month">All Time</span>
                  <p className="asp-kpi-label">RESOLUTION RATE</p>
                  <p className="asp-kpi-value">{stats.resolutionRate}%</p>
                  <p className="asp-kpi-sub">
                    {stats.resolvedCount} of {stats.totalCount} tickets solved
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="asp-error">
              <span>{error}</span>
              <button onClick={fetchData}>Retry</button>
            </div>
          )}

          {/* Table card */}
          <div className="asp-table-card">
            <div className="asp-table-head">
              <h3 className="asp-table-title">Active Support Registry</h3>
              <div className="asp-table-actions">
                <button className="asp-export-btn" onClick={exportCSV} title="Export current page as CSV">
                  <FaDownload /> Export Report
                </button>
                <div className="asp-filter-wrap" ref={filterRef}>
                  <button
                    className={`asp-filter-btn ${filtersOpen ? "asp-filter-btn--open" : ""}`}
                    onClick={openFiltersPanel}
                  >
                    <FaFilter /> Filters
                    {hasActiveFilters && <span className="asp-filter-dot" />}
                  </button>

                  {filtersOpen && (
                    <div className="asp-filter-panel">
                      <div className="asp-fp-head">
                        <span className="asp-fp-title">ACTIVE FILTERS</span>
                        <button className="asp-fp-clear" onClick={clearFilters}>Clear All</button>
                      </div>

                      <div className="asp-fp-section">
                        <p className="asp-fp-label">Status</p>
                        {["all", "open", "resolved"].map((s) => (
                          <label key={s} className="asp-fp-radio">
                            <input
                              type="radio"
                              name="asp-status"
                              checked={pendingStatus === s}
                              onChange={() => setPendingStatus(s)}
                            />
                            <span>
                              {s === "all" ? "All Statuses" : STATUS_CFG[s]?.label || s}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="asp-fp-section">
                        <p className="asp-fp-label">Category</p>
                        {["all", ...CATEGORIES].map((c) => (
                          <label key={c} className="asp-fp-radio">
                            <input
                              type="radio"
                              name="asp-category"
                              checked={pendingCategory === c}
                              onChange={() => setPendingCategory(c)}
                            />
                            <span>{c === "all" ? "All Categories" : CATEGORY_LABELS[c]}</span>
                          </label>
                        ))}
                      </div>

                      <button className="asp-fp-apply" onClick={applyFilters}>Apply Filters</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="asp-loading">Loading tickets…</div>
            ) : (
              <>
                <table className="asp-table">
                  <thead>
                    <tr>
                      <th>TICKET ID</th>
                      <th>REQUESTER</th>
                      <th>SUBJECT</th>
                      <th>CATEGORY</th>
                      <th>CREATED ON</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="asp-table-empty">No tickets found.</td>
                      </tr>
                    ) : (
                      tickets.map((t) => {
                        const roleCfg = ROLE_TAG_CFG[t.userId?.role] || ROLE_TAG_CFG.user;
                        const statusCfg = STATUS_CFG[t.status] || { label: t.status, cls: "asp-badge--open" };
                        return (
                          <tr key={t._id} className="asp-table-row">
                            <td>
                              <button
                                className="asp-ticket-id-link"
                                onClick={() => navigate(`/admin/support/${t._id}`)}
                              >
                                #{t.ticketId}
                              </button>
                            </td>
                            <td>
                              <div className="asp-req-cell">
                                <p className="asp-req-name">{t.userId?.name || "—"}</p>
                                <span className={`asp-role-tag ${roleCfg.cls}`}>
                                  {roleCfg.label}
                                </span>
                              </div>
                            </td>
                            <td className="asp-subject-cell">
                              <span title={t.subject}>{t.subject}</span>
                            </td>
                            <td>{CATEGORY_LABELS[t.category] || t.category}</td>
                            <td className="asp-date-cell">{fmtDate(t.createdAt)}</td>
                            <td>
                              <span className={`asp-badge ${statusCfg.cls}`}>
                                {statusCfg.label}
                              </span>
                            </td>
                            <td>
                              <button
                                className="asp-view-btn"
                                onClick={() => navigate(`/admin/support/${t._id}`)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="asp-pagination">
                  <span className="asp-pag-info">
                    Showing {from}–{to} of {total.toLocaleString()} tickets
                  </span>
                  <div className="asp-pag-controls">
                    <button
                      className="asp-pag-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    >
                      <FaChevronLeft /> Previous
                    </button>
                    <button
                      className="asp-pag-btn"
                      disabled={page >= pages}
                      onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    >
                      Next <FaChevronRight />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Customer Satisfaction Overview */}
          {!loading && satisfaction && (
            <div className="asp-sat-section">
              <h3 className="asp-sat-section-title">Customer Satisfaction Overview</h3>
              <p className="asp-sat-section-sub">
                Real-time feedback analysis from resolved support tickets and closed cases.
              </p>
              <div className="asp-sat-cards">
                <SatCard
                  title="TICKET RESOLUTION FEEDBACK"
                  data={satisfaction.ticketFeedback}
                />
                <SatCard
                  title="CASE CLOSURE FEEDBACK"
                  data={satisfaction.caseFeedback}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
