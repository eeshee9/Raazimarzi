// src/pages/AdminDashboard.js
import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import AdminSidebar from "../components/AdminSidebar";
import { useNavigate } from "react-router-dom";
import { FaBell, FaSearch } from "react-icons/fa";
import { Line } from "react-chartjs-2";
import {
  Chart, CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Filler,
} from "chart.js";

import UDIcon1 from "../assets/icons/ud-1.png";
import UDIcon2 from "../assets/icons/ud-2.png";
import UDIcon3 from "../assets/icons/ud-3.png";
import UDIcon4 from "../assets/icons/ud-4.png";
import ADIcon5 from "../assets/icons/ad-5.png";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const pad = (n) => String(n).padStart(2, "0");

const getStatusClass = (s = "") => {
  const v = s.toLowerCase();
  if (["resolved", "awarded"].includes(v)) return "adx-badge-green";
  if (["active", "in-progress", "mediation", "hearing"].includes(v)) return "adx-badge-blue";
  if (["pending", "pending-review", "notice-sent"].includes(v)) return "adx-badge-yellow";
  if (["rejected", "withdrawn", "closed"].includes(v)) return "adx-badge-gray";
  return "adx-badge-blue";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState({ name: "Admin", avatar: "" });
  const [stats, setStats] = useState({
    total: 0, active: 0, resolved: 0, pending: 0, revenue: 0, resolutionRate: 0,
  });
  const [cases, setCases] = useState([]);
  const [actions, setActions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [revenueData, setRevenueData] = useState(Array(12).fill(0));

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAdmin(data.admin || { name: "Admin", avatar: "" });
          const s = data.stats || {};
          setStats({
            total:          s.total          ?? 0,
            active:         s.active         ?? 0,
            resolved:       s.resolved       ?? 0,
            pending:        s.pending        ?? s.pendingReview ?? 0,
            revenue:        s.revenue        ?? 0,
            resolutionRate: s.resolutionRate ?? 0,
          });
          setCases(data.cases || []);
          setActions(data.actions || []);
          setSessions(data.sessions || []);
          setRegistrations(data.registrations || []);
          if (data.revenueMonthly?.length === 12) setRevenueData(data.revenueMonthly);
        }
      } catch (err) {
        console.error("AdminDashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Revenue growth: current month vs previous month
  const currentMonthIdx = new Date().getMonth();
  const currentMonthRev = revenueData[currentMonthIdx] || 0;
  const lastMonthRev = currentMonthIdx > 0 ? (revenueData[currentMonthIdx - 1] || 0) : 0;
  const revenueGrowth = lastMonthRev > 0
    ? Number(((currentMonthRev - lastMonthRev) / lastMonthRev * 100).toFixed(0))
    : null;
  const growthBarPct = revenueGrowth !== null ? Math.min(Math.abs(revenueGrowth), 100) : 0;

  const chartData = {
    labels: MONTH_LABELS,
    datasets: [{
      data: revenueData,
      borderColor: "rgba(119,138,255,1)",
      backgroundColor: "rgba(119,138,255,0.1)",
      borderWidth: 2.5,
      tension: 0.45,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 5,
    }],
  };
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#bbb" } },
      y: { display: false },
    },
  };

  const filteredCases = cases.filter((c) =>
    !search || [c.caseId, c.title, c.assignedTo, c.mediator, c.party1, c.party2]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="adx-root">
      <AdminSidebar />
      <div className="adx-loading">Loading dashboard…</div>
    </div>
  );

  return (
    <div className="adx-root">
      <AdminSidebar activePage="dashboard" />

      <main className="adx-main">

        {/* ── Topbar ── */}
        <header className="adx-topbar">
          <div className="adx-search">
            <FaSearch className="adx-search__icon" />
            <input
              className="adx-search__input"
              placeholder="Search cases, mediators or files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="adx-topbar__right">
            <button className="adx-topbar__bell" aria-label="Notifications"><FaBell /></button>
            <img
              src={admin.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=778aff&color=fff&size=80`}
              alt={admin.name}
              className="adx-topbar__avatar"
            />
          </div>
        </header>

        <div className="adx-body">

          {/* ── STAT CARDS ── */}
          <section className="adx-stats">

            <div className="adx-stat">
              <div className="adx-stat__icon-wrap">
                <img src={UDIcon1} alt="" className="adx-stat__img" />
              </div>
              <div className="adx-stat__body">
                <p className="adx-stat__label">Total Cases</p>
                <h2 className="adx-stat__value">{pad(stats.total)}</h2>
              </div>
            </div>

            <div className="adx-stat">
              <div className="adx-stat__icon-wrap">
                <img src={UDIcon2} alt="" className="adx-stat__img" />
              </div>
              <div className="adx-stat__body">
                <p className="adx-stat__label">Active Cases</p>
                <h2 className="adx-stat__value">{pad(stats.active)}</h2>
              </div>
            </div>

            <div className="adx-stat">
              <div className="adx-stat__icon-wrap">
                <img src={UDIcon3} alt="" className="adx-stat__img" />
              </div>
              <div className="adx-stat__body">
                <p className="adx-stat__label">Resolved Cases</p>
                <h2 className="adx-stat__value">{pad(stats.resolved)}</h2>
              </div>
              {Number(stats.resolutionRate) > 0 && (
                <span className="adx-stat__badge adx-stat__badge--up">
                  ↑ {stats.resolutionRate}%
                </span>
              )}
            </div>

            <div className="adx-stat">
              <div className="adx-stat__icon-wrap">
                <img src={UDIcon4} alt="" className="adx-stat__img" />
              </div>
              <div className="adx-stat__body">
                <p className="adx-stat__label">Pending Actions</p>
                <h2 className="adx-stat__value">{pad(stats.pending)}</h2>
              </div>
            </div>

            <div className="adx-stat">
              <div className="adx-stat__icon-wrap">
                <img src={ADIcon5} alt="" className="adx-stat__img" />
              </div>
              <div className="adx-stat__body">
                <p className="adx-stat__label">Total Revenue</p>
                <h2 className="adx-stat__value">
                  {stats.revenue >= 100000
                    ? `₹${(stats.revenue / 100000).toFixed(1)}L`
                    : `₹${stats.revenue.toLocaleString("en-IN")}`}
                </h2>
              </div>
              {revenueGrowth !== null && (
                <span className={`adx-stat__badge ${revenueGrowth >= 0 ? "adx-stat__badge--up" : "adx-stat__badge--down"}`}>
                  {revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(revenueGrowth)}%
                </span>
              )}
            </div>

          </section>

          {/* ── MIDDLE: Action Required + Revenue ── */}
          <section className="adx-mid">

            {/* Action Required */}
            <div className="adx-card adx-actions-card">
              <h3 className="adx-actions-card__title">
                <span className="adx-actions-card__bang">❗</span> Action Required
              </h3>
              <div className="adx-actions-list">
                {actions.map((a) => (
                  <div key={a.id} className="adx-action-row">
                    <span className="adx-action-row__icon">{a.icon}</span>
                    <div className="adx-action-row__text">
                      <p className="adx-action-row__title">{a.title}</p>
                      <p className="adx-action-row__sub">{a.sub}</p>
                    </div>
                    <button
                      className="adx-action-row__btn"
                      onClick={() => navigate(
                        a.id === "unassigned" ? "/admin/mediators" : "/admin/new-cases"
                      )}
                    >
                      {a.btn}
                    </button>
                  </div>
                ))}
                {actions.length === 0 && (
                  <p className="adx-empty-msg">No pending actions. All caught up!</p>
                )}
              </div>
            </div>

            {/* Revenue Card */}
            <div className="adx-card adx-revenue-card">
              <div className="adx-revenue-card__top">
                <div className="adx-revenue-card__meta">
                  <p className="adx-revenue-card__title">Revenue</p>
                  <p className="adx-revenue-card__sub">Earnings Performance</p>
                </div>
                <div className="adx-revenue-card__kpi">
                  <span className="adx-revenue-card__amount">
                    ₹{stats.revenue.toLocaleString("en-IN")}.00
                  </span>
                  {revenueGrowth !== null && (
                    <span className={`adx-revenue-card__pct ${revenueGrowth >= 0 ? "up" : "down"}`}>
                      {revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(revenueGrowth)}%
                    </span>
                  )}
                  <p className="adx-revenue-card__bar-label">Growth this month</p>
                  <div className="adx-revenue-card__bar">
                    <div
                      className="adx-revenue-card__bar-fill"
                      style={{ width: `${growthBarPct}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="adx-revenue-card__chart">
                <Line data={chartData} options={chartOpts} />
              </div>
            </div>

          </section>

          {/* ── BOTTOM: Recent Disputes + Right Widgets ── */}
          <section className="adx-bottom">

            {/* Recent Disputes Table */}
            <div className="adx-card adx-table-card">
              <div className="adx-table-card__hdr">
                <h3 className="adx-table-card__title">Recent Disputes</h3>
                <button className="adx-link-btn" onClick={() => navigate("/admin/new-cases")}>View All</button>
              </div>
              <div className="adx-table-wrap">
                <table className="adx-table">
                  <thead>
                    <tr>
                      <th>CASE ID</th>
                      <th>TOPIC</th>
                      <th>MEDIATOR</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.slice(0, 6).map((c) => (
                      <tr key={c._id} onClick={() => navigate(`/admin/view-details/${c._id}`)}>
                        <td className="adx-table__caseid">{c.caseId}</td>
                        <td>{c.title}</td>
                        <td>{c.assignedTo || c.mediator || "—"}</td>
                        <td>
                          <span className={`adx-badge ${getStatusClass(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="adx-view-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/view-details/${c._id}`); }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCases.length === 0 && (
                      <tr>
                        <td colSpan={5} className="adx-table__empty">
                          {search ? "No cases match your search." : "No cases found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Widgets */}
            <div className="adx-widgets">

              {/* Upcoming Sessions */}
              <div className="adx-card adx-sessions-card">
                <div className="adx-sessions-card__hdr">
                  <p className="adx-sessions-card__label">UPCOMING SESSIONS</p>
                  <button className="adx-link-btn" onClick={() => navigate("/admin/case-meetings")}>View All</button>
                </div>
                <div className="adx-sessions-list">
                  {sessions.map((s) => (
                    <div key={s.id} className="adx-session-row" onClick={() => navigate("/admin/case-meetings")}>
                      <div className="adx-session-row__date">
                        <span className="adx-session-row__month">{s.month}</span>
                        <span className="adx-session-row__day">{s.day}</span>
                      </div>
                      <div className="adx-session-row__info">
                        <p className="adx-session-row__title">{s.caseId}</p>
                        <p className="adx-session-row__time">{s.time}</p>
                      </div>
                      <span className="adx-session-row__arrow">›</span>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <p className="adx-empty-msg">No upcoming sessions.</p>
                  )}
                </div>
              </div>

              {/* New Registrations */}
              <div className="adx-card adx-regs-card">
                <p className="adx-sessions-card__label" style={{ marginBottom: 14 }}>NEW REGISTRATIONS</p>
                <div className="adx-regs-list">
                  {registrations.map((r) => (
                    <div key={r.id} className="adx-reg-row">
                      <div className="adx-reg-row__avatar">{r.name.charAt(0).toUpperCase()}</div>
                      <div className="adx-reg-row__info">
                        <p className="adx-reg-row__name">{r.name}</p>
                        <p className="adx-reg-row__role">{r.role}</p>
                      </div>
                      <span className="adx-reg-row__ago">{r.ago}</span>
                    </div>
                  ))}
                  {registrations.length === 0 && (
                    <p className="adx-empty-msg">No recent registrations.</p>
                  )}
                </div>
                <button
                  className="adx-view-all-btn"
                  onClick={() => navigate("/admin/users")}
                >
                  VIEW ALL USERS
                </button>
              </div>

            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
