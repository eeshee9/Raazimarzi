// src/pages/UserMyCases.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import api from "../api/axios";

import "./UserMyCases.css";
import { FaDownload, FaChevronLeft, FaChevronRight, FaTimes, FaChevronRight as FaArrow } from "react-icons/fa";

// ─── Status badge styles ───────────────────────────────────────────────────────
const getStatusStyle = (status = "") => {
  const s = status.toLowerCase().replace(/\s+/g, "-");
  switch (s) {
    case "pending":
      return { background: "#fef3c7", color: "#92400e", label: "PENDING" };
    case "mediation":
    case "in-mediation":
      return { background: "#dbeafe", color: "#1d4ed8", label: "IN MEDIATION" };
    case "active":
    case "in-progress":
      return { background: "#dcfce7", color: "#16a34a", label: status.toUpperCase() };
    case "resolved":
      return { background: "#dcfce7", color: "#16a34a", label: "RESOLVED" };
    case "rejected":
      return { background: "#fee2e2", color: "#dc2626", label: "REJECTED" };
    case "closed":
      return { background: "#f3f4f6", color: "#6b7280", label: "CLOSED" };
    default:
      return { background: "#f3f4f6", color: "#6b7280", label: status.toUpperCase() };
  }
};

// ─── Relative time helper ──────────────────────────────────────────────────────
const relativeTime = (dateStr) => {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `Updated ${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `Updated ${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days === 1) return "Updated Yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return days < 14 ? "Updated 1 week ago" : `Updated ${weeks} weeks ago`;
};

// ─── Mobile Card ───────────────────────────────────────────────────────────────
const MobileCard = ({ c, idx, isSelected, onToggle, onNavigate }) => {
  const statusMeta = getStatusStyle(c.status || "pending");
  return (
    <div
      className={`mc-mobile-card ${isSelected ? "mc-mobile-card-selected" : ""}`}
      onClick={() => onNavigate(c._id)}
    >
      {/* Top row: case ID + status badge */}
      <div className="mc-mobile-card-top">
        <div className="mc-mobile-meta">
          <span className="mc-mobile-caseid">#{c.caseId || "—"}</span>
          <span
            className="mc-mobile-badge"
            style={{ background: statusMeta.background, color: statusMeta.color }}
          >
            {statusMeta.label}
          </span>
        </div>
        <FaChevronRight className="mc-mobile-arrow" />
      </div>

      {/* Content row: checkbox + text */}
      <div className="mc-mobile-card-body">
        <div
          className={`mc-mobile-checkbox ${isSelected ? "mc-mobile-checkbox-checked" : ""}`}
          onClick={e => { e.stopPropagation(); onToggle(c._id); }}
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="mc-mobile-text">
          <p className="mc-mobile-title">{c.caseTitle || c.caseType || "—"}</p>
          <p className="mc-mobile-updated">{relativeTime(c.updatedAt || c.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const UserMyCases = () => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  // ── Data state ──
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [roleFilter, setRoleFilter] = useState("All Cases");
  const [amountFilter, setAmountFilter] = useState("All Ranges");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mediatorFilter, setMediatorFilter] = useState("All Status");
  const [activeFilters, setActiveFilters] = useState([]);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const casesRes = await api.get("/cases/my-cases");
      const raised = casesRes.data?.raisedCases ?? [];
      const opponent = casesRes.data?.opponentCases ?? [];
      const merged = [
        ...raised.map(c => ({ ...c, _myRole: "petitioner" })),
        ...opponent.map(c => ({ ...c, _myRole: "respondent" })),
      ];
      setAllCases(merged);
    } catch (err) {
      if (err.response?.status === 401) { navigate("/login"); return; }
      setError(err.response?.data?.message || err.message || "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Filtering ────────────────────────────────────────────────────────────────
  const filteredCases = allCases.filter(c => {
    // Status
    if (statusFilter !== "All Statuses") {
      const s = (c.status || "").toLowerCase();
      if (statusFilter === "Pending Review" && !["pending", "pending-review", "in review", "in-review"].includes(s)) return false;
      if (statusFilter === "Mediation"      && !["mediation", "in-progress", "assigned", "notice-sent", "arbitration"].includes(s)) return false;
      if (statusFilter === "Rejected"       && !["rejected"].includes(s)) return false;
      if (statusFilter === "Resolved"       && !["resolved", "awarded"].includes(s)) return false;
      if (statusFilter === "Closed"         && !["closed", "withdrawn"].includes(s)) return false;
    }
    // Category
    if (categoryFilter !== "All Categories" && c.caseType?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    // Role
    if (roleFilter === "Petitioner" && c._myRole !== "petitioner") return false;
    if (roleFilter === "Respondent" && c._myRole !== "respondent") return false;
    // Amount (filing fee buckets)
    if (amountFilter !== "All Ranges") {
      const fee = c.filingFee || 0;
      const bucketMap = { "₹499 /-": 499, "₹999 /-": 999, "₹1499 /-": 1499, "₹1999 /-": 1999, "₹2499 /-": 2499 };
      const bucket = bucketMap[amountFilter];
      if (bucket !== undefined && fee !== bucket) return false;
    }
    // Date range
    if (dateFrom || dateTo) {
      const cDate = new Date(c.createdAt);
      if (dateFrom && cDate < new Date(dateFrom)) return false;
      if (dateTo   && cDate > new Date(dateTo + "T23:59:59")) return false;
    }
    // Mediator assigned/unassigned
    if (mediatorFilter === "Assigned"   && !c.assignedNeutral) return false;
    if (mediatorFilter === "Unassigned" && c.assignedNeutral)  return false;
    return true;
  });

  const totalCases = filteredCases.length;
  const totalPages = Math.max(1, Math.ceil(totalCases / rowsPerPage));
  const paginatedCases = filteredCases.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ─── Active filter tags ────────────────────────────────────────────────────────
  useEffect(() => {
    const tags = [];
    if (statusFilter    !== "All Statuses")    tags.push({ key: "status",   label: statusFilter });
    if (categoryFilter  !== "All Categories")  tags.push({ key: "category", label: categoryFilter });
    if (roleFilter      !== "All Cases")       tags.push({ key: "role",     label: roleFilter });
    if (amountFilter    !== "All Ranges")      tags.push({ key: "amount",   label: amountFilter });
    if (dateFrom || dateTo) tags.push({ key: "date", label: [dateFrom, dateTo].filter(Boolean).join(" – ") });
    if (mediatorFilter  !== "All Status")      tags.push({ key: "mediator", label: mediatorFilter });
    setActiveFilters(tags);
    setPage(1);
  }, [statusFilter, categoryFilter, roleFilter, amountFilter, dateFrom, dateTo, mediatorFilter]);

  const removeFilter = (key) => {
    if (key === "status")   setStatusFilter("All Statuses");
    if (key === "category") setCategoryFilter("All Categories");
    if (key === "role")     setRoleFilter("All Cases");
    if (key === "amount")   setAmountFilter("All Ranges");
    if (key === "date")     { setDateFrom(""); setDateTo(""); }
    if (key === "mediator") setMediatorFilter("All Status");
  };

  const clearAllFilters = () => {
    setStatusFilter("All Statuses");
    setCategoryFilter("All Categories");
    setRoleFilter("All Cases");
    setAmountFilter("All Ranges");
    setDateFrom("");
    setDateTo("");
    setMediatorFilter("All Status");
  };

  // ─── Row selection ─────────────────────────────────────────────────────────────
  const toggleRow = (id) =>
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  // ─── Export CSV ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Case ID", "Topic", "Petitioner", "Respondent", "Mediator", "Status", "Filed Date"];
    const rows = filteredCases.map(c => [
      c.caseId,
      c.caseTitle || c.caseType || "-",
      c.petitionerDetails?.fullName || "-",
      c.defendantDetails?.fullName || "-",
      c.mediator?.name || "-",
      c.status || "Pending",
      c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "-",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "my-cases.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Pagination footer ─────────────────────────────────────────────────────────
  const PaginationFooter = () => (
    <div className="mc-pagination">
      <div className="mc-rows-per-page">
        Rows per page:
        <select
          className="mc-rpp-select"
          value={rowsPerPage}
          onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
        >
          {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="mc-page-info">
        {totalCases === 0
          ? "0 cases"
          : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, totalCases)} of ${totalCases.toLocaleString()} cases`}
      </div>

      <div className="mc-page-nav">
        <button className="mc-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><FaChevronLeft size={11} /></button>
        <button className="mc-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><FaChevronRight size={11} /></button>
      </div>

      {selectedRows.length > 0 && (
        <span className="mc-selected-info mc-selected-below">
          Selected row(s) -{" "}
          {filteredCases
            .map((c, i) => (selectedRows.includes(c._id) ? i + 1 : null))
            .filter(Boolean)
            .join(", ")}
        </span>
      )}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      <UserSidebar activePage="my-cases" />

      <main className="main-content mc-main">
        {/* Mobile top bar — shown only on mobile */}
        <div className="mc-mobile-topbar">
          <button className="mc-mobile-hamburger" aria-label="menu">
            <span /><span /><span />
          </button>
          <div className="mc-mobile-search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="#9ca3af" strokeWidth="1.5" /><path d="M10 10l2 2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span>Search cases, mediators or files...</span>
          </div>
          <button className="mc-mobile-bell" aria-label="notifications">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1a5 5 0 00-5 5v3l-1.5 2H15.5L14 9V6a5 5 0 00-5-5z" stroke="#374151" strokeWidth="1.5" /><path d="M7.5 15a1.5 1.5 0 003 0" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Desktop navbar — hidden on mobile */}
        <div className="mc-desktop-navbar">
          <UserNavbar />
        </div>

        {/* Page heading */}
        <div className="mc-heading-row">
          <div>
            <h1 className="mc-title">My Cases</h1>
            <p className="mc-subtitle">Manage, monitor, and take action on all disputes</p>
          </div>
          <button className="mc-export-btn" onClick={exportCSV}>
            <FaDownload style={{ fontSize: 13 }} />
            Export as CSV
          </button>
        </div>

        {/* Filters */}
        <div className="mc-filters-row">
          <div className="mc-filter-group">
            <label className="mc-filter-label">STATUS</label>
            <select className="mc-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All Statuses</option>
              <option>Pending Review</option>
              <option>Mediation</option>
              <option>Rejected</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>
          <div className="mc-filter-group">
            <label className="mc-filter-label">CATEGORY</label>
            <select className="mc-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option>All Categories</option>
              <option>Property</option>
              <option>Rental</option>
              <option>Consumer</option>
              <option>Individual</option>
              <option>Commercial</option>
            </select>
          </div>
          <div className="mc-filter-group">
            <label className="mc-filter-label">MY ROLE</label>
            <select className="mc-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option>All Cases</option>
              <option>Petitioner</option>
              <option>Respondent</option>
            </select>
          </div>
          {/* Amount + Date Range + Mediator hidden on mobile via CSS */}
          <div className="mc-filter-group mc-filter-desktop-only">
            <label className="mc-filter-label">AMOUNT</label>
            <select className="mc-select" value={amountFilter} onChange={e => setAmountFilter(e.target.value)}>
              <option>All Ranges</option>
              <option>₹499 /-</option>
              <option>₹999 /-</option>
              <option>₹1499 /-</option>
              <option>₹1999 /-</option>
              <option>₹2499 /-</option>
            </select>
          </div>
          <div className="mc-filter-group mc-filter-desktop-only">
            <label className="mc-filter-label">DATE RANGE</label>
            <div className="mc-date-range">
              <input type="date" className="mc-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="mc-date-sep">–</span>
              <input type="date" className="mc-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="mc-filter-group mc-filter-desktop-only">
            <label className="mc-filter-label">MEDIATOR</label>
            <select className="mc-select" value={mediatorFilter} onChange={e => setMediatorFilter(e.target.value)}>
              <option>All Status</option>
              <option>Assigned</option>
              <option>Unassigned</option>
            </select>
          </div>
        </div>

        {/* Active filter tags */}
        {activeFilters.length > 0 && (
          <div className="mc-active-filters">
            <span className="mc-active-label">Active Filters:</span>
            {activeFilters.map(f => (
              <span key={f.key} className="mc-filter-tag">
                {f.label}
                <button className="mc-tag-remove" onClick={() => removeFilter(f.key)}><FaTimes size={9} /></button>
              </span>
            ))}
            <button className="mc-clear-all" onClick={clearAllFilters}>Clear All</button>
          </div>
        )}

        {/* ── DESKTOP TABLE ─────────────────────────────────────────────────────── */}
        <div className="mc-table-wrapper mc-desktop-table">
          {loading ? (
            <div className="mc-state-center"><div className="mc-spinner" /><p>Loading your cases…</p></div>
          ) : error ? (
            <div className="mc-state-center">
              <p style={{ color: "#dc2626" }}>⚠️ {error}</p>
              <button className="mc-retry-btn" onClick={fetchData}>Retry</button>
            </div>
          ) : (
            <table className="mc-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>CASE ID</th>
                  <th>TOPIC</th>
                  <th>PARTICIPANTS</th>
                  <th>MEDIATOR</th>
                  <th>STATUS</th>
                  <th>FEE (₹)</th>
                  <th>FILED DATE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCases.length === 0 ? (
                  <tr><td colSpan="9" className="mc-empty-row">No cases found</td></tr>
                ) : (
                  paginatedCases.map((c, idx) => {
                    const globalIdx = (page - 1) * rowsPerPage + idx + 1;
                    const isSelected = selectedRows.includes(c._id);
                    const statusMeta = getStatusStyle(c.status || "pending");
                    return (
                      <tr key={c._id} className={isSelected ? "mc-row-selected" : ""}>
                        <td>
                          <div
                            className={`mc-row-num ${isSelected ? "mc-row-num-selected" : ""}`}
                            onClick={() => toggleRow(c._id)}
                          >{globalIdx}</div>
                        </td>
                        <td className="mc-case-id">#{c.caseId || "—"}</td>
                        <td className="mc-topic">{c.caseTitle || c.caseType || "—"}</td>
                        <td className="mc-participants">
                          <div className="mc-participant">
                            <span className="mc-participant-role">(Petitioner)</span>
                            <span className="mc-participant-name">{c.petitionerDetails?.fullName || "—"}</span>
                          </div>
                          <div className="mc-participant">
                            <span className="mc-participant-role">(Respondent)</span>
                            <span className="mc-participant-name">{c.defendantDetails?.fullName || "—"}</span>
                          </div>
                        </td>
                        <td className="mc-mediator">{c.mediator?.name || "—"}</td>
                        <td>
                          <span className="mc-status-badge" style={{ background: statusMeta.background, color: statusMeta.color }}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="mc-fee">{c.fee ? `₹${Number(c.fee).toLocaleString("en-IN")} /-` : "—"}</td>
                        <td className="mc-date">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                            : "—"}
                        </td>
                        <td>
                          <button className="mc-view-btn" onClick={() => navigate(`/user/my-cases/details/${c._id}`)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
          {!loading && !error && <PaginationFooter />}
        </div>

        {/* ── MOBILE CARD LIST ──────────────────────────────────────────────────── */}
        <div className="mc-mobile-list">
          {loading ? (
            <div className="mc-state-center"><div className="mc-spinner" /><p>Loading your cases…</p></div>
          ) : error ? (
            <div className="mc-state-center">
              <p style={{ color: "#dc2626" }}>⚠️ {error}</p>
              <button className="mc-retry-btn" onClick={fetchData}>Retry</button>
            </div>
          ) : paginatedCases.length === 0 ? (
            <div className="mc-state-center"><p>No cases found</p></div>
          ) : (
            <>
              <h2 className="mc-mobile-section-title">Recent Disputes</h2>
              {paginatedCases.map((c, idx) => (
                <MobileCard
                  key={c._id}
                  c={c}
                  idx={(page - 1) * rowsPerPage + idx + 1}
                  isSelected={selectedRows.includes(c._id)}
                  onToggle={toggleRow}
                  onNavigate={(id) => navigate(`/user/my-cases/details/${id}`)}
                />
              ))}
            </>
          )}
          {!loading && !error && <PaginationFooter />}
        </div>

      </main>
    </div>
  );
};

export default UserMyCases;