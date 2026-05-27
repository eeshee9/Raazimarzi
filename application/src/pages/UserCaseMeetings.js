// src/pages/UserCaseMeetings.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import "./UserCaseMeetings.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};
const avatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=778aff&color=fff&size=80`;

const StatusBadge = ({ status }) => {
  const map = {
    Upcoming:  { bg: "#eef2ff", color: "#4f46e5" },
    Ongoing:   { bg: "#dcfce7", color: "#16a34a" },
    Completed: { bg: "#f0fdf4", color: "#15803d" },
    Cancelled: { bg: "#fee2e2", color: "#dc2626" },
    Missed:    { bg: "#fef3c7", color: "#92400e" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span className="ucm-badge" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

const UserCaseMeetings = () => {
  const navigate = useNavigate();
  const [search, setSearch]       = useState("");
  const [meetings, setMeetings]   = useState({ upcoming: [], past: [] });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/meetings/my");
      setMeetings({
        upcoming: res.data.upcoming || [],
        past:     res.data.past     || [],
      });
    } catch (err) {
      console.error("❌ fetchMeetings:", err);
      setError("Failed to load meetings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const filter = (list) =>
    list.filter((m) =>
      (m.caseId?.caseTitle || m.meetingTitle || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const upcoming = filter(meetings.upcoming);
  const today    = filter(
    meetings.upcoming.filter((m) => {
      const d = new Date(m.scheduledDate);
      const n = new Date();
      return (
        d.getFullYear() === n.getFullYear() &&
        d.getMonth()    === n.getMonth()    &&
        d.getDate()     === n.getDate()
      );
    })
  );
  const future   = filter(
    meetings.upcoming.filter((m) => {
      const d = new Date(m.scheduledDate);
      const n = new Date();
      return !(
        d.getFullYear() === n.getFullYear() &&
        d.getMonth()    === n.getMonth()    &&
        d.getDate()     === n.getDate()
      );
    })
  );

  const handleJoin = (m) => {
    // Go to pre-join lobby
    navigate(`/user/meetings/lobby/${m._id}`);
  };

  return (
    <div className="dashboard-container">
      <UserSidebar activePage="meetings" />

      <main className="ucm-main">
        <UserNavbar />

        {/* Search */}
        <div className="ucm-search-row">
          <div className="ucm-search-wrap">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5"/>
              <path d="M11 11l2.5 2.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="ucm-search"
              placeholder="Search by case title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="ucm-reset-btn" onClick={() => setSearch("")}>Reset</button>
        </div>

        {error && (
          <div className="ucm-error">
            <span>⚠️ {error}</span>
            <button onClick={fetchMeetings}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="ucm-loading"><div className="ucm-spinner" /><p>Loading meetings…</p></div>
        ) : (
          <>
            {/* ── Today's Meetings ── */}
            <section className="ucm-section">
              <div className="ucm-section-header">
                <h3>Today's Meetings</h3>
                {today.length > 0 && <span className="ucm-count">{today.length}</span>}
              </div>

              {today.length === 0 ? (
                <div className="ucm-empty-card">
                  <span className="ucm-empty-icon">📅</span>
                  <p>No meetings scheduled for today.</p>
                </div>
              ) : (
                <div className="ucm-today-list">
                  {today.map((m) => {
                    const mediator  = m.mediator;
                    const caseTitle = m.caseId?.caseTitle || m.meetingTitle || "—";
                    const status    = m.displayStatus || "Upcoming";
                    return (
                      <div key={m._id} className="ucm-today-card">
                        <div className="ucm-today-time">
                          <p className="ucm-time-big">{fmtTime(m.startTime)}</p>
                          <p className="ucm-time-dur">{m.duration ? `${m.duration} min` : "—"}</p>
                        </div>

                        <div className="ucm-today-info">
                          <p className="ucm-today-title">{caseTitle}</p>
                          <p className="ucm-today-id">
                            Session ID: <strong>{m._id?.slice(-6).toUpperCase()}</strong>
                          </p>
                        </div>

                        <div className="ucm-today-people">
                          {mediator && (
                            <div className="ucm-person">
                              <img
                                src={mediator.avatar || avatar(mediator.name)}
                                alt={mediator.name}
                                onError={(e) => { e.target.src = avatar(mediator.name); }}
                              />
                              <div>
                                <p className="ucm-person-name">{mediator.name}</p>
                                <p className="ucm-person-role">Mediator</p>
                              </div>
                            </div>
                          )}
                          {(m.participants || []).slice(0, 2).map((p, i) => (
                            <div key={i} className="ucm-person">
                              <img
                                src={p.user?.avatar || avatar(p.name || p.user?.name)}
                                alt={p.name}
                                onError={(e) => { e.target.src = avatar(p.name); }}
                              />
                              <div>
                                <p className="ucm-person-name">{p.name || p.user?.name || "—"}</p>
                                <p className="ucm-person-role">{p.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="ucm-today-meta">
                          <StatusBadge status={status} />
                          <p className="ucm-participants-count">
                            {(m.participants?.length || 0) + (mediator ? 1 : 0)} participants
                          </p>
                        </div>

                        <button
                          className={`ucm-join-btn ${status === "Ongoing" ? "ucm-join-live" : ""}`}
                          onClick={() => handleJoin(m)}
                        >
                          {status === "Ongoing" ? "🔴 Join Live" : "Join Now"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Upcoming Meetings ── */}
            <section className="ucm-section">
              <div className="ucm-section-header">
                <h3>Upcoming Case Meetings</h3>
                {future.length > 0 && <span className="ucm-count">{future.length}</span>}
              </div>

              {future.length === 0 ? (
                <div className="ucm-empty-card">
                  <span className="ucm-empty-icon">🗓️</span>
                  <p>No upcoming meetings found.</p>
                </div>
              ) : (
                <div className="ucm-upcoming-grid">
                  {future.map((m) => {
                    const caseTitle = m.caseId?.caseTitle || m.meetingTitle || "—";
                    const status    = m.displayStatus || "Upcoming";
                    return (
                      <div key={m._id} className="ucm-upcoming-card">
                        <div className="ucm-upcoming-top">
                          <div className="ucm-upcoming-icon">📋</div>
                          <StatusBadge status={status} />
                        </div>
                        <p className="ucm-upcoming-title">{caseTitle}</p>
                        <div className="ucm-upcoming-meta">
                          <span>📅 {fmtDate(m.scheduledDate)}</span>
                          <span>🕐 {fmtTime(m.startTime)}</span>
                        </div>
                        {m.mediator && (
                          <div className="ucm-upcoming-mediator">
                            <img
                              src={m.mediator.avatar || avatar(m.mediator.name)}
                              alt={m.mediator.name}
                              onError={(e) => { e.target.src = avatar(m.mediator.name); }}
                            />
                            <span>{m.mediator.name} · Mediator</span>
                          </div>
                        )}
                        <button
                          className="ucm-view-btn"
                          onClick={() => navigate(`/user/meetings/lobby/${m._id}`)}
                        >
                          View Details →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Past Meetings ── */}
            {meetings.past.length > 0 && (
              <section className="ucm-section">
                <div className="ucm-section-header">
                  <h3>Past Meetings</h3>
                  <span className="ucm-count">{meetings.past.length}</span>
                </div>
                <div className="ucm-past-list">
                  {filter(meetings.past).map((m) => (
                    <div key={m._id} className="ucm-past-card">
                      <div className="ucm-past-left">
                        <p className="ucm-past-title">{m.caseId?.caseTitle || m.meetingTitle || "—"}</p>
                        <p className="ucm-past-date">{fmtDate(m.scheduledDate)} · {fmtTime(m.startTime)}</p>
                      </div>
                      <StatusBadge status={m.displayStatus || "Completed"} />
                      <button
                        className="ucm-view-btn ucm-view-btn-sm"
                        onClick={() => navigate(`/user/meetings/summary/${m._id}`)}
                      >
                        View Summary
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default UserCaseMeetings;