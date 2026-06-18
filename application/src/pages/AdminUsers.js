// src/pages/AdminUsers.js — aus- namespace
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaFilter, FaDownload, FaEye,
  FaUsers, FaUserPlus, FaBriefcase, FaRupeeSign,
  FaChevronLeft, FaChevronRight, FaTimes,
} from "react-icons/fa";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminUsers.css";

/* ── Formatters ─────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtINR = (n) => {
  if (!n) return "₹0";
  const num = Number(n);
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000)   return `₹${(num / 1000).toFixed(0)}k`;
  return `₹${num.toFixed(0)}`;
};

const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/* ── Filter helpers ──────────────────────────────────────────── */
const DATE_RANGES = ["All Time", "Today", "Last 7 Days", "Last 30 Days", "Last 3 Months", "Custom Range"];
const CASE_BUCKETS = ["0 Cases", "1-5 Cases", "6-10 Cases", "10+ Cases"];
const PAY_BUCKETS  = ["No Payments", "₹1-₹1,000", "₹1,001-₹5,000", "₹5,001+"];

const caseInBucket = (count, bucket) => {
  if (bucket === "0 Cases")    return count === 0;
  if (bucket === "1-5 Cases")  return count >= 1 && count <= 5;
  if (bucket === "6-10 Cases") return count >= 6 && count <= 10;
  if (bucket === "10+ Cases")  return count > 10;
  return true;
};
const payInBucket = (amt, bucket) => {
  if (bucket === "No Payments") return amt === 0;
  if (bucket === "₹1-₹1,000")  return amt >= 1 && amt <= 1000;
  if (bucket === "₹1,001-₹5,000") return amt > 1000 && amt <= 5000;
  if (bucket === "₹5,001+")    return amt > 5000;
  return true;
};

/* ── Stat Card ───────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="aus-stat-card">
    <div className="aus-stat-icon" style={{ background: color }}>
      <Icon />
    </div>
    <div className="aus-stat-body">
      <p className="aus-stat-label">{label}</p>
      <p className="aus-stat-value">{value}</p>
      {sub && <p className="aus-stat-sub">{sub}</p>}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminUsers = () => {
  const navigate = useNavigate();

  /* Data state */
  const [users,      setUsers]      = useState([]);
  const [stats,      setStats]      = useState({ totalUsers: 0, newThisMonth: 0, totalCases: 0, totalRevenue: 0 });
  const [userGrowth, setUserGrowth] = useState([]);
  const [caseVolume, setCaseVolume] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  /* Pagination / search */
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  /* Filter state */
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [dateRange,     setDateRange]     = useState("All Time");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [caseBuckets,   setCaseBuckets]   = useState([]);
  const [payBuckets,    setPayBuckets]    = useState([]);
  const [pendingDate,   setPendingDate]   = useState("All Time");
  const [pendingFrom,   setPendingFrom]   = useState("");
  const [pendingTo,     setPendingTo]     = useState("");
  const [pendingCases,  setPendingCases]  = useState([]);
  const [pendingPay,    setPendingPay]    = useState([]);

  const filterRef = useRef(null);

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10, search };
      if (dateRange !== "All Time" && dateRange !== "Custom Range") {
        const now = new Date();
        if (dateRange === "Today") {
          params.dateFrom = now.toISOString().slice(0,10);
          params.dateTo   = now.toISOString().slice(0,10);
        } else if (dateRange === "Last 7 Days") {
          params.dateFrom = new Date(now - 7*86400000).toISOString().slice(0,10);
        } else if (dateRange === "Last 30 Days") {
          params.dateFrom = new Date(now - 30*86400000).toISOString().slice(0,10);
        } else if (dateRange === "Last 3 Months") {
          params.dateFrom = new Date(now - 90*86400000).toISOString().slice(0,10);
        }
      }
      if (dateRange === "Custom Range") {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo)   params.dateTo   = dateTo;
      }

      const res = await api.get("/admin/users/analytics", { params });
      const d   = res.data;
      setStats(d.stats);
      setUsers(d.users);
      setTotal(d.total);
      setPages(d.pages);
      setUserGrowth(d.userGrowth);
      setCaseVolume(d.caseVolume);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search, dateRange, dateFrom, dateTo]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchData();
  }, [navigate, fetchData]);

  /* Close filters on outside click */
  useEffect(() => {
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFiltersOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Client-side filtering (cases/payments) on loaded page ── */
  const visibleUsers = users.filter((u) => {
    if (caseBuckets.length > 0 && !caseBuckets.some((b) => caseInBucket(u.caseCount, b))) return false;
    if (payBuckets.length  > 0 && !payBuckets.some((b)  => payInBucket(u.totalPayments, b))) return false;
    return true;
  });

  /* ── Filter panel apply/clear ── */
  const openFilters = () => {
    setPendingDate(dateRange); setPendingFrom(dateFrom); setPendingTo(dateTo);
    setPendingCases([...caseBuckets]); setPendingPay([...payBuckets]);
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setDateRange(pendingDate); setDateFrom(pendingFrom); setDateTo(pendingTo);
    setCaseBuckets([...pendingCases]); setPayBuckets([...pendingPay]);
    setPage(1);
    setFiltersOpen(false);
  };
  const clearAll = () => {
    setPendingDate("All Time"); setPendingFrom(""); setPendingTo("");
    setPendingCases([]); setPendingPay([]);
  };

  const toggleBucket = (list, setList, val) =>
    setList((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]);

  /* ── CSV export (from loaded page) ── */
  const exportCSV = () => {
    const headers = ["Name","Email","User ID","Joined On","Cases","Total Payments"];
    const rows = visibleUsers.map((u) => [
      u.name, u.email, u.displayId,
      fmtDate(u.createdAt),
      u.caseCount,
      u.totalPayments,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "admin-users.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to   = Math.min(page * 10, total);

  return (
    <div className="aus-root">
      <AdminSidebar />
      <div className="aus-main">

        {/* Topbar */}
        <header className="aus-topbar">
          <form className="aus-search" onSubmit={handleSearch}>
            <FaSearch className="aus-search-icon" />
            <input
              className="aus-search-input"
              placeholder="Search users by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <div className="aus-topbar-right">
            <button className="aus-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="aus-admin-avatar" />
          </div>
        </header>

        <div className="aus-body">

          {/* Page heading */}
          <div className="aus-page-head">
            <div>
              <h2 className="aus-page-title">Users</h2>
              <p className="aus-page-sub">Manage and monitor all platform users</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="aus-stats-row">
            <StatCard
              icon={FaUsers}
              label="TOTAL USERS"
              value={stats.totalUsers.toLocaleString("en-IN")}
              color="rgba(119,138,255,0.14)"
            />
            <StatCard
              icon={FaUserPlus}
              label="NEW USERS THIS MONTH"
              value={stats.newThisMonth.toLocaleString("en-IN")}
              sub="This month"
              color="rgba(16,185,129,0.12)"
            />
            <StatCard
              icon={FaBriefcase}
              label="TOTAL CASES"
              value={stats.totalCases.toLocaleString("en-IN")}
              color="rgba(251,191,36,0.14)"
            />
            <StatCard
              icon={FaRupeeSign}
              label="TOTAL REVENUE"
              value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
              color="rgba(239,68,68,0.1)"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="aus-error">
              <span>{error}</span>
              <button onClick={fetchData}>Retry</button>
            </div>
          )}

          {/* Users table card */}
          <div className="aus-table-card">
            <div className="aus-table-head">
              <h3 className="aus-table-title">Total Users</h3>
              <div className="aus-table-actions">
                <button className="aus-csv-btn" onClick={exportCSV} title="Export current page as CSV">
                  <FaDownload /> Export CSV
                </button>
                <div className="aus-filter-wrap" ref={filterRef}>
                  <button
                    className={`aus-filter-btn ${filtersOpen ? "aus-filter-btn--open" : ""}`}
                    onClick={openFilters}
                  >
                    <FaFilter /> Filters
                    {(caseBuckets.length + payBuckets.length > 0 || dateRange !== "All Time") && (
                      <span className="aus-filter-dot" />
                    )}
                  </button>

                  {filtersOpen && (
                    <div className="aus-filter-panel">
                      <div className="aus-fp-head">
                        <span className="aus-fp-title">ACTIVE FILTERS</span>
                        <button className="aus-fp-clearall" onClick={clearAll}>Clear All</button>
                      </div>

                      {/* Registration Date */}
                      <div className="aus-fp-section">
                        <p className="aus-fp-label">Registration Date</p>
                        {DATE_RANGES.map((dr) => (
                          <label key={dr} className="aus-fp-radio">
                            <input
                              type="radio"
                              name="dateRange"
                              checked={pendingDate === dr}
                              onChange={() => setPendingDate(dr)}
                            />
                            <span>{dr}</span>
                          </label>
                        ))}
                        {pendingDate === "Custom Range" && (
                          <div className="aus-fp-custom-dates">
                            <input type="date" className="aus-fp-date" value={pendingFrom}
                              onChange={(e) => setPendingFrom(e.target.value)} />
                            <span>—</span>
                            <input type="date" className="aus-fp-date" value={pendingTo}
                              onChange={(e) => setPendingTo(e.target.value)} />
                          </div>
                        )}
                      </div>

                      {/* Cases Involved */}
                      <div className="aus-fp-section">
                        <p className="aus-fp-label">Cases Involved</p>
                        <div className="aus-fp-checks-grid">
                          {CASE_BUCKETS.map((b) => (
                            <label key={b} className="aus-fp-check">
                              <input
                                type="checkbox"
                                checked={pendingCases.includes(b)}
                                onChange={() => toggleBucket(pendingCases, setPendingCases, b)}
                              />
                              <span>{b}</span>
                            </label>
                          ))}
                        </div>
                        <p className="aus-fp-page-note">Applies to current page only.</p>
                      </div>

                      {/* Total Payments */}
                      <div className="aus-fp-section">
                        <p className="aus-fp-label">Total Payments</p>
                        {PAY_BUCKETS.map((b) => (
                          <label key={b} className="aus-fp-check">
                            <input
                              type="checkbox"
                              checked={pendingPay.includes(b)}
                              onChange={() => toggleBucket(pendingPay, setPendingPay, b)}
                            />
                            <span>{b}</span>
                          </label>
                        ))}
                        <p className="aus-fp-page-note">Applies to current page only.</p>
                      </div>

                      <button className="aus-fp-apply" onClick={applyFilters}>Apply Filters</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="aus-table-loading">Loading users…</div>
            ) : (
              <>
                <table className="aus-table">
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>USER ID</th>
                      <th>JOINED ON</th>
                      <th>CASES</th>
                      <th>TOTAL PAYMENTS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.length === 0 ? (
                      <tr><td colSpan={6} className="aus-table-empty">No users found.</td></tr>
                    ) : visibleUsers.map((u) => (
                      <tr key={u._id} className="aus-table-row">
                        <td>
                          <div className="aus-user-cell">
                            {u.avatar
                              ? <img src={u.avatar} alt={u.name} className="aus-user-av" />
                              : <div className="aus-user-av aus-user-av--initials">{initials(u.name)}</div>
                            }
                            <div>
                              <p className="aus-user-name">{u.name}</p>
                              <p className="aus-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="aus-cell-id">{u.displayId}</td>
                        <td className="aus-cell-date">{fmtDate(u.createdAt)}</td>
                        <td className="aus-cell-cases">{u.caseCount} {u.caseCount === 1 ? "Case" : "Cases"}</td>
                        <td className="aus-cell-pay">{fmtINR(u.totalPayments)}</td>
                        <td>
                          <button
                            className="aus-view-btn"
                            onClick={() => navigate(`/admin/users/${u._id}`)}
                            title="View user details"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="aus-pagination">
                  <span className="aus-pag-info">
                    Showing {from}–{to} of {total.toLocaleString("en-IN")} users
                  </span>
                  <div className="aus-pag-controls">
                    <button
                      className="aus-pag-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    >
                      <FaChevronLeft /> Previous
                    </button>
                    <button
                      className="aus-pag-btn"
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

          {/* Charts */}
          <div className="aus-charts-row">
            {/* User Growth */}
            <div className="aus-chart-card">
              <div className="aus-chart-head">
                <h3 className="aus-chart-title">User Growth</h3>
              </div>
              <div className="aus-chart-area">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={userGrowth} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 12 }}
                      labelStyle={{ fontWeight: 700, color: "#374151" }}
                    />
                    <Bar dataKey="users" name="New Users" fill="rgba(119,138,255,0.7)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Case Volume */}
            <div className="aus-chart-card">
              <div className="aus-chart-head">
                <h3 className="aus-chart-title">Monthly Case Volume</h3>
                <p className="aus-chart-sub">Activity breakdown for the year</p>
              </div>
              <div className="aus-chart-area">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={caseVolume}>
                    <defs>
                      <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="rgba(119,138,255,1)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="rgba(119,138,255,1)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 12 }}
                      labelStyle={{ fontWeight: 700, color: "#374151" }}
                    />
                    <Area
                      type="monotone" dataKey="cases" name="Cases"
                      stroke="rgba(119,138,255,1)" strokeWidth={2}
                      fill="url(#caseGrad)"
                      dot={{ r: 3, fill: "rgba(119,138,255,1)", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
