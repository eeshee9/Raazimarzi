import React, { useState, useEffect } from "react";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

import UDIcon1 from "../assets/icons/ud-1.png";
import UDIcon2 from "../assets/icons/ud-2.png";
import UDIcon3 from "../assets/icons/ud-3.png";
import UDIcon4 from "../assets/icons/ud-4.png";
import fingerprint from "../assets/icons/fingerprint.png";
import respond from "../assets/icons/respond.png";

import "./UserDashboard.css";


// ─── Status badge helper (shared desktop + mobile) ────────────────────────────
const getStatusStyle = (status) => {
  const s = status?.toLowerCase();
  if (["resolved", "awarded"].includes(s))
    return { background: "#dcfce7", color: "#16a34a" };
  if (["in-progress", "assigned", "notice-sent", "mediation", "arbitration", "in mediation"].includes(s))
    return { background: "#dbeafe", color: "#1d4ed8" };
  if (["pending", "pending-review"].includes(s))
    return { background: "#fef3c7", color: "#92400e" };
  if (["rejected", "withdrawn", "closed"].includes(s))
    return { background: "#f3f4f6", color: "#6b7280" };
  return { background: "#fef3c7", color: "#92400e" };
};

const getStatusLabel = (status) => {
  const s = status?.toLowerCase();
  if (s === "mediation" || s === "in mediation") return "IN MEDIATION";
  return (status || "PENDING").toUpperCase();
};

// ─── Relative time ─────────────────────────────────────────────────────────────
const relativeTime = (dateStr) => {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 24) return `Updated ${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days === 1) return "Updated Yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 14) return "Closed 1 week ago";
  return `Updated ${weeks} weeks ago`;
};

// ─── Mobile dispute card ───────────────────────────────────────────────────────
const MobileDisputeCard = ({ c, onNavigate }) => {
  const statusStyle = getStatusStyle(c.status);
  const statusLabel = getStatusLabel(c.status);
  return (
    <div className="mob-dispute-card" onClick={() => onNavigate(c.id || c._id)}>
      <div className="mob-dispute-top">
        <div className="mob-dispute-meta">
          <span className="mob-case-id-badge">#{c.id || c._id}</span>
          <span className="mob-status-badge" style={statusStyle}>{statusLabel}</span>
        </div>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="mob-dispute-arrow">
          <path d="M1 1l5 5-5 5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mob-dispute-title">{c.title || c.topic || "—"}</p>
      <p className="mob-dispute-updated">{relativeTime(c.updatedAt || c.createdAt)}</p>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const UserDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, pending: 0 });
  const [cases, setCases] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [actions, setActions] = useState([]);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get("/dashboard/user");
        const data = res.data;

        if (!data.success) { setError(data.message || "Failed to load dashboard"); return; }

        setStats(data.stats || { total: 0, active: 0, resolved: 0, pending: 0 });
        setCases(data.cases || []);
        setMeetings(data.meetings || []);
        setMessages(data.messages || []);
        setActions(data.actions || []);
        setUserName(data.userName || "User");
      } catch (err) {
        console.error("❌ Dashboard fetch error:", err);
        setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return { month: "—", day: "—" };
    const d = new Date(dateStr);
    return {
      month: d.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
      day: d.getDate(),
    };
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = Date.now() - d;
    if (diff < 86400000) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    return "Yesterday";
  };

  // ── Loading / error guards ──
  if (loading) {
    return (
      <div className="dashboard-container">
        <UserSidebar activePage="dashboard" />
        <main className="main-content">
          <UserNavbar />
          <div className="center-state"><p>Loading dashboard...</p></div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <UserSidebar activePage="dashboard" />
        <main className="main-content">
          <UserNavbar />
          <div className="center-state"><p style={{ color: "#dc2626" }}>{error}</p></div>
        </main>
      </div>
    );
  }

  // ── Full render ──
  return (
    <div className="dashboard-container">
      <UserSidebar activePage="dashboard" />

      <main className="main-content">


        {/* ════ MOBILE TOP BAR ════ */}
        <div className="mob-topbar">
          <button
            className="mob-hamburger"
            aria-label="Open menu"
            onClick={() => window.dispatchEvent(new Event("open-mobile-menu"))}
          >
            <span /><span /><span />
          </button>
          <button className="mob-bell" aria-label="notifications">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 00-6 6v3.5L2.5 14h15L16 11.5V8a6 6 0 00-6-6z"
                stroke="#374151" strokeWidth="1.5" />
              <path d="M8 16a2 2 0 004 0"
                stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>


        {/* ════ DESKTOP NAVBAR ════ */}
        <div className="dash-desktop-navbar">
          <UserNavbar />
        </div>

        {/* ════ GREETING ════ */}
        <div className="greeting">
          <h2>Hello, {userName} 👋</h2>
          <p>
            You have{" "}
            <span className="highlight">{stats.active} active disputes</span>{" "}
            requiring your attention.
          </p>
        </div>

        {/* ════ STATS ════ */}
        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon-wrap"><img src={UDIcon1} alt="Total Cases" className="stat-icon" /></div>
            <div className="stat-info">
              <p className="stat-label">Total Cases</p>
              <h2 className="stat-value">{String(stats.total).padStart(2, "0")}</h2>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap"><img src={UDIcon2} alt="Active Cases" className="stat-icon" /></div>
            <div className="stat-info">
              <p className="stat-label">Active Cases</p>
              <h2 className="stat-value">{String(stats.active).padStart(2, "0")}</h2>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap"><img src={UDIcon3} alt="Resolved Cases" className="stat-icon" /></div>
            <div className="stat-info">
              <p className="stat-label">Resolved Cases</p>
              <h2 className="stat-value">{String(stats.resolved).padStart(2, "0")}</h2>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap"><img src={UDIcon4} alt="Pending Actions" className="stat-icon" /></div>
            <div className="stat-info">
              <p className="stat-label">Pending Actions</p>
              <h2 className="stat-value">{String(stats.pending).padStart(2, "0")}</h2>
            </div>
          </div>
        </section>

        {/* ════ ACTION REQUIRED + RECENT DISPUTES ════ */}
        <section className="cases-actions-row">

          {/* Action Required — shown FIRST on mobile (order via CSS) */}
          <div className="action-required-panel">
            <div className="action-header">
              <span className="action-exclaim">!</span>
              <h3 className="action-title">Action Required</h3>
            </div>
            {actions.length === 0 ? (
              <p className="empty-state">No actions required.</p>
            ) : (
              <div className="action-list">
                {actions.map((action, i) => (
                  <div key={i} className="action-item">
                    <div className="action-left-border" />
                    <div className="action-icon">
                      {action.type === "document"
                        ? <img src={fingerprint} alt="doc" />
                        : <img src={respond} alt="chat" />}
                    </div>
                    <p className="action-text">{action.description}</p>
                    <button
                      className="action-cta"
                      onClick={() => navigate(action.type === "document" ? "/user/documents" : "/user/chats")}
                    >
                      {action.type === "document" ? "Complete Now" : "Reply"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Disputes */}
          <div className="disputes-wrapper">
            <div className="disputes-header">
              <h3 className="disputes-title">Recent Disputes</h3>
              <button className="view-all-btn" onClick={() => navigate("/user/my-cases")}>View All</button>
            </div>

            {/* Desktop table */}
            <div className="cases-section">
              {cases.length === 0 ? (
                <p className="empty-state">No cases found.</p>
              ) : (
                <table className="cases-table">
                  <thead>
                    <tr>
                      <th>CASE ID</th>
                      <th>TOPIC</th>
                      <th>RESPONDENT</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.slice(0, 5).map((c, index) => (
                      <tr key={index}>
                        <td className="case-id">#{c.id}</td>
                        <td>{c.title || c.topic}</td>
                        <td>{c.party2 || c.respondent}</td>
                        <td>
                          <span className="status-badge" style={getStatusStyle(c.status)}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button className="view-details-btn" onClick={() => navigate(`/user/my-cases/details/${c._id}`)}>View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile card list */}
            <div className="mob-dispute-list">
              {cases.length === 0 ? (
                <p className="empty-state">No cases found.</p>
              ) : (
                cases.slice(0, 5).map((c, i) => (
                  <MobileDisputeCard
                    key={i}
                    c={c}
                    onNavigate={() => navigate(`/user/my-cases/details/${c._id}`)}
                  />
                ))
              )}
            </div>
          </div>

        </section>

        {/* ════ BOTTOM ROW ════ */}
        <section className="bottom-row">

          {/* Recent Messages */}
          <div className="messages-section">
            <div className="section-header">
              <h3>Recent Messages</h3>
              <button className="icon-btn">···</button>
            </div>
            <div className="message-list">
              {messages.length === 0 ? (
                <p className="empty-state">No messages yet.</p>
              ) : (
                messages.slice(0, 2).map((msg, i) => (
                  <div key={i} className="message-item">
                    {msg.avatar ? (
                      <img src={msg.avatar} alt={msg.sender} className="msg-avatar" />
                    ) : (
                      <div className="msg-avatar msg-avatar--initials">
                        {(msg.sender || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="msg-body">
                      <div className="msg-top">
                        <span className="msg-sender">{msg.sender}</span>
                        <span className="msg-time">{formatMessageTime(msg.createdAt)}</span>
                      </div>
                      <p className="msg-preview">"{msg.preview}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="goto-messenger-btn" onClick={() => navigate("/user/chats")}>
              Go to Messenger
            </button>
          </div>

          {/* Upcoming Appointments */}
          <div className="appointments-section">
            <h3>Upcoming Appointments</h3>
            {meetings.length === 0 ? (
              <p className="empty-state">No upcoming appointments.</p>
            ) : (
              <div className="appointment-list">
                {meetings.slice(0, 2).map((m, i) => {
                  const fd = formatDate(m.date);
                  const isPrimary = i === 0;
                  return (
                    <div key={m.id || i} className="appointment-card">
                      <div className="appt-date-badge">
                        <span className="appt-month">{fd.month}</span>
                        <span className="appt-day">{fd.day}</span>
                      </div>
                      <div className="appt-info">
                        <p className="appt-title">{m.title || m.caseId}</p>
                        <p className="appt-time">
                          {m.time || formatTime(m.date)} / #{m.caseId || m.id}
                        </p>
                      </div>
                      {isPrimary ? (
                        <button className="join-meeting-btn" onClick={() => navigate("/user/case-meetings")}>
                          Join Meeting
                        </button>
                      ) : (
                        <button className="view-details-outline-btn" onClick={() => navigate("/user/case-meetings")}>
                          View Details
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
};

export default UserDashboard;