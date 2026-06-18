import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../api/axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import "./AdminPayments.css";

/* ── Constants ── */
const PAGE_LIMIT = 10;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── Helpers ── */
const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const statusCls = (s = "") => {
  const k = s.toLowerCase();
  if (k === "paid")    return "apay-status apay-status--paid";
  if (k === "failed")  return "apay-status apay-status--failed";
  return "apay-status apay-status--pending";
};

const statusLabel = (s = "") => {
  const k = s.toLowerCase();
  if (k === "paid")   return "Successful";
  if (k === "failed") return "Failed";
  return "Pending";
};

/* Builds ordered 12-month array from backend aggregation result */
const buildTrendData = (raw = []) => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d  = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const found = raw.find((r) => r._id.year === yr && r._id.month === mo);
    return { name: MONTHS[mo - 1], revenue: found ? found.revenue : 0 };
  });
};

const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

/* ── Avatar ── */
const Avatar = ({ src, name, size = 32 }) => (
  <div
    style={{
      width: size, height: size, borderRadius: "50%",
      overflow: "hidden", flexShrink: 0,
      background: "#778aff",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
  >
    {src ? (
      <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.32 }}>
        {getInitials(name)}
      </span>
    )}
  </div>
);

/* ── Chart tooltip ── */
const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="apay-tooltip">
      <p className="apay-tooltip-label">{label}</p>
      <p className="apay-tooltip-value">{fmtINR(payload[0].value)}</p>
    </div>
  );
};

const DIST_COLORS = ["#778aff", "#f59e0b", "#ef4444"];

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
const AdminPayments = () => {
  const navigate = useNavigate();

  /* Dashboard state */
  const [stats,       setStats]       = useState(null);
  const [trendData,   setTrendData]   = useState([]);
  const [distData,    setDistData]    = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  /* Table state */
  const [transactions, setTransactions] = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [tableLoading, setTableLoading] = useState(false);

  /* Filters */
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput,  setSearchInput]  = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const debounceRef = useRef(null);

  /* Debounce search */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  /* Fetch dashboard KPIs + charts (once on mount) */
  useEffect(() => {
    const fetchDash = async () => {
      setDashLoading(true);
      try {
        const res = await api.get("/payments/admin/dashboard");
        const { stats: s, revenueTrend, distribution: dist } = res.data;
        setStats(s);
        setTrendData(buildTrendData(revenueTrend));
        setDistData([
          { name: "Successful", value: dist.paid.count,    pct: dist.paid.pct,    color: DIST_COLORS[0] },
          { name: "Pending",    value: dist.pending.count, pct: dist.pending.pct, color: DIST_COLORS[1] },
          { name: "Failed",     value: dist.failed.count,  pct: dist.failed.pct,  color: DIST_COLORS[2] },
        ]);
      } catch (err) {
        console.error("fetchDash error:", err);
      } finally {
        setDashLoading(false);
      }
    };
    fetchDash();
  }, []);

  /* Fetch transactions on filter/search/page change */
  const fetchTransactions = useCallback(async (pg = 1) => {
    setTableLoading(true);
    try {
      const params = { page: pg, limit: PAGE_LIMIT };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get("/payments/admin/transactions", { params });
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error("fetchTransactions error:", err);
    } finally {
      setTableLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const handlePageChange = (pg) => {
    if (pg < 1 || pg > pages || tableLoading) return;
    fetchTransactions(pg);
  };

  /* Pagination range display */
  const startRow = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const endRow   = Math.min(page * PAGE_LIMIT, total);

  /* Chart: y-axis formatter */
  const yAxisFmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  /* ── Render ── */
  return (
    <div className="apay-root">
      <AdminSidebar />
      <div className="apay-main">

        {/* Header */}
        <div className="apay-header">
          <h1 className="apay-title">Payments</h1>
          <p className="apay-subtitle">
            Monitor mediation fee collections, payment status, and transaction history.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="apay-kpi-grid">
          <div className="apay-kpi-card">
            <div className="apay-kpi-icon apay-kpi-icon--blue">💳</div>
            <div className="apay-kpi-body">
              <div className="apay-kpi-label">Total Revenue</div>
              <div className="apay-kpi-value">
                {dashLoading ? "—" : fmtINR(stats?.totalRevenue)}
              </div>
              <div className="apay-kpi-sub">All-time collected (paid only)</div>
            </div>
          </div>

          <div className="apay-kpi-card">
            <div className="apay-kpi-icon apay-kpi-icon--green">✅</div>
            <div className="apay-kpi-body">
              <div className="apay-kpi-label">Successful Payments</div>
              <div className="apay-kpi-value">
                {dashLoading ? "—" : (stats?.successCount ?? "—")}
              </div>
              <div className="apay-kpi-sub">All-time paid transactions</div>
            </div>
          </div>

          <div className="apay-kpi-card">
            <div className="apay-kpi-icon apay-kpi-icon--amber">🕐</div>
            <div className="apay-kpi-body">
              <div className="apay-kpi-label">Pending Payments</div>
              <div className="apay-kpi-value">
                {dashLoading ? "—" : (stats?.pendingCount ?? "—")}
              </div>
              <div className="apay-kpi-sub">Awaiting payment</div>
            </div>
          </div>

          <div className="apay-kpi-card">
            <div className="apay-kpi-icon apay-kpi-icon--red">⚠️</div>
            <div className="apay-kpi-body">
              <div className="apay-kpi-label">Failed Payments</div>
              <div className="apay-kpi-value">
                {dashLoading ? "—" : (stats?.failedCount ?? "—")}
              </div>
              <div className="apay-kpi-sub">Failed transactions</div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="apay-card">
          <div className="apay-card-header">
            <span className="apay-card-title">Recent Transactions</span>
            <div className="apay-table-filters">
              <select
                className="apay-filter-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); }}
              >
                <option value="all">All Status</option>
                <option value="paid">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <div className="apay-search-wrap">
                <span className="apay-search-icon">🔍</span>
                <input
                  className="apay-search-input"
                  placeholder="Search TXN, INV, Case, or user..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button className="apay-search-clear" onClick={() => setSearchInput("")}>✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="apay-table-wrap">
            <table className="apay-table">
              <thead>
                <tr>
                  <th>TRANSACTION ID</th>
                  <th>USER</th>
                  <th>CASE ID</th>
                  <th>AMOUNT</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={7} className="apay-table-msg">Loading transactions...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="apay-table-msg">No transactions found.</td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn._id}>
                      <td className="apay-txn-id">{txn.txnId}</td>
                      <td>
                        <div className="apay-user-cell">
                          <Avatar
                            src={txn.userId?.avatar}
                            name={txn.userId?.name || "?"}
                            size={32}
                          />
                          <div className="apay-user-info">
                            <span className="apay-user-name">{txn.userId?.name || "Unknown"}</span>
                            <span className="apay-user-email">{txn.userId?.email || ""}</span>
                          </div>
                        </div>
                      </td>
                      <td>{txn.caseCaseId || "—"}</td>
                      <td className="apay-amount">{fmtINR(txn.amount)}</td>
                      <td>{fmtDate(txn.createdAt)}</td>
                      <td>
                        <span className={statusCls(txn.status)}>
                          {statusLabel(txn.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="apay-action-btn"
                          title="View invoice details"
                          onClick={() => navigate(`/admin/payments/${txn._id}`)}
                        >
                          👁
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="apay-table-footer">
            <span className="apay-count-text">
              {total === 0
                ? "No transactions"
                : `Showing ${startRow}–${endRow} of ${total} transactions`}
            </span>
            <div className="apay-pagination">
              <button
                className="apay-page-btn"
                disabled={page <= 1 || tableLoading}
                onClick={() => handlePageChange(page - 1)}
              >
                ‹
              </button>
              <span className="apay-page-info">{page} / {pages}</span>
              <button
                className="apay-page-btn"
                disabled={page >= pages || tableLoading}
                onClick={() => handlePageChange(page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="apay-charts-row">

          {/* Revenue Trend */}
          <div className="apay-card apay-chart-card">
            <div className="apay-card-header">
              <span className="apay-card-title">Revenue Trend</span>
              <span className="apay-chart-scope">Monthly · Last 12 months · Paid only</span>
            </div>
            {dashLoading ? (
              <div className="apay-chart-loading">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={yAxisFmt}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<TrendTooltip />} cursor={{ fill: "#f0f0ff" }} />
                  <Bar dataKey="revenue" fill="#778aff" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Distribution */}
          <div className="apay-card apay-chart-card apay-dist-card">
            <div className="apay-card-header">
              <span className="apay-card-title">Status Distribution</span>
            </div>
            {dashLoading || distData.length === 0 ? (
              <div className="apay-chart-loading">
                {dashLoading ? "Loading chart..." : "No transactions yet."}
              </div>
            ) : (
              <>
                <div className="apay-donut-wrap">
                  <PieChart width={160} height={160}>
                    <Pie
                      data={distData}
                      cx={75}
                      cy={75}
                      innerRadius={48}
                      outerRadius={72}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {distData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                  <div className="apay-donut-center">
                    <span className="apay-donut-total">{distData.reduce((s, d) => s + d.value, 0)}</span>
                    <span className="apay-donut-label">Total</span>
                  </div>
                </div>
                <div className="apay-dist-legend">
                  {distData.map((d, i) => (
                    <div key={i} className="apay-dist-row">
                      <span className="apay-dist-dot" style={{ background: d.color }} />
                      <span className="apay-dist-name">{d.name}</span>
                      <span className="apay-dist-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPayments;
