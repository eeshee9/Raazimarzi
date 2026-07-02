// src/pages/MediatorDashboard.js — New design (greeting, 4 KPIs, disputes, schedule, messages, appointments)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  MessageCircle,
  Video,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorDashboard.css";

/* ── Helpers ── */
const STATUS_CFG = {
  resolved:     { label: "Resolved",     bg: "#ECFDF5", color: "#059669" },
  Resolved:     { label: "Resolved",     bg: "#ECFDF5", color: "#059669" },
  Hearing:      { label: "Hearing",      bg: "#EFF6FF", color: "#2563EB" },
  hearing:      { label: "Hearing",      bg: "#EFF6FF", color: "#2563EB" },
  mediation:    { label: "Mediation",    bg: "#F0F9FF", color: "#0284C7" },
  Assigned:     { label: "Active",       bg: "#FFF7ED", color: "#C2410C" },
  "in-progress":{ label: "In Progress",  bg: "#F5F3FF", color: "#7C3AED" },
};
const getStatus = (s) => STATUS_CFG[s] || { label: s || "—", bg: "#F3F4F6", color: "#6B7280" };

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const formatDate = (d) => {
  const dt = new Date(d);
  return {
    month: dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day:   dt.getDate(),
  };
};

const msgTime = (ts) => {
  if (!ts) return "";
  const dt   = new Date(ts);
  const now  = new Date();
  const diff = now - dt;
  if (diff < 86400000) {
    return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (diff < 172800000) return "Yesterday";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const Sk = ({ w = "100%", h = 14, r = 6 }) => (
  <div className="mdn-sk" style={{ width: w, height: h, borderRadius: r }} />
);

/* ── KPI Card ── */
const KpiCard = ({ icon, value, label, iconBg, iconColor, highlight, loading }) => (
  <div className={`mdn-kpi${highlight ? " mdn-kpi-highlight" : ""}`}>
    <div className="mdn-kpi-icon" style={{ background: iconBg, color: iconColor }}>
      {icon}
    </div>
    {loading ? (
      <div className="mdn-kpi-body">
        <Sk w="50px" h={32} r={6} />
        <Sk w="90px" h={11} r={4} />
      </div>
    ) : (
      <div className="mdn-kpi-body">
        <p className="mdn-kpi-value">{value ?? "—"}</p>
        <p className="mdn-kpi-label">{label}</p>
      </div>
    )}
  </div>
);

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
const MediatorDashboard = () => {
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const storedUser  = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName   = (storedUser?.name || "Mediator").split(" ")[0];
  const currentUid  = storedUser?._id || storedUser?.id || "";

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get("/mediator/dashboard");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const activeCases = data?.summary?.activeCases ?? 0;
  const subtitle    = activeCases > 0
    ? `You have ${activeCases} active dispute${activeCases !== 1 ? "s" : ""} requiring your attention.`
    : "All caught up — no active disputes at the moment.";

  /* ── Peer name helper (for messages) ── */
  const peerName = (participants = []) => {
    const other = participants.find((p) => String(p._id) !== currentUid);
    return other?.name || "Unknown";
  };
  const peerInitials = (name = "") =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  /* ── Error state ── */
  if (error && !loading) {
    return (
      <MediatorLayout>
        <div className="mdn-error">
          <RefreshCw size={34} />
          <p>{error}</p>
          <button onClick={fetchDashboard}>Retry</button>
        </div>
      </MediatorLayout>
    );
  }

  return (
    <MediatorLayout>
      <div className="mdn-page">

        {/* ── Greeting ── */}
        <div className="mdn-greeting">
          <h1>Hello, {firstName} <span className="mdn-wave">👋</span></h1>
          <p>{subtitle}</p>
        </div>

        {/* ── KPI cards ── */}
        <div className="mdn-kpi-grid">
          <KpiCard
            loading={loading}
            icon={<LayoutGrid size={20} />}
            value={data?.summary?.totalCases}
            label="Total Cases"
            iconBg="#EFF6FF" iconColor="#2563EB"
          />
          <KpiCard
            loading={loading}
            icon={<Briefcase size={20} />}
            value={data?.summary?.activeCases}
            label="Active Cases"
            iconBg="#FFF7ED" iconColor="#EA580C"
          />
          <KpiCard
            loading={loading}
            icon={<CheckCircle2 size={20} />}
            value={data?.summary?.resolvedCases}
            label="Resolved Cases"
            iconBg="#ECFDF5" iconColor="#16A34A"
          />
          <KpiCard
            loading={loading}
            icon={<AlertTriangle size={20} />}
            value={data?.summary?.highPriorityCases}
            label="High Priority"
            iconBg="#FEF2F2" iconColor="#DC2626"
            highlight
          />
        </div>

        {/* ── Main row: disputes + schedule ── */}
        <div className="mdn-main-row">

          {/* Recent Disputes */}
          <div className="mdn-card mdn-disputes-card">
            <div className="mdn-card-header">
              <h2 className="mdn-card-title">Recent Disputes</h2>
              <button className="mdn-view-all" onClick={() => navigate("/mediator/my-cases")}>
                View All
              </button>
            </div>

            {loading ? (
              <div className="mdn-sk-rows">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="mdn-sk-row">
                    <Sk w="80px" />
                    <Sk w="140px" />
                    <Sk w="90px" />
                    <Sk w="70px" h={22} r={20} />
                    <Sk w={72} h={28} r={8} />
                  </div>
                ))}
              </div>
            ) : !data?.recentDisputes?.length ? (
              <div className="mdn-empty">
                <Briefcase size={32} />
                <p>No disputes assigned yet.</p>
              </div>
            ) : (
              <div className="mdn-table-wrap">
                <table className="mdn-table">
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
                    {data.recentDisputes.map((c) => {
                      const st = getStatus(c.status);
                      const respondentName =
                        c.respondent?.userId?.name ||
                        c.respondent?.name ||
                        "—";
                      return (
                        <tr key={c._id || c.caseId}>
                          <td><span className="mdn-case-id">{c.caseId}</span></td>
                          <td>
                            <span className="mdn-case-title">{c.caseTitle}</span>
                          </td>
                          <td><span className="mdn-respondent">{respondentName}</span></td>
                          <td>
                            <span
                              className="mdn-status"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td>
                            <button
                              className="mdn-view-btn"
                              onClick={() => navigate(`/mediator/cases/${c._id}`)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="mdn-card mdn-schedule-card">
            <div className="mdn-card-header">
              <h2 className="mdn-card-title">Today's Schedule</h2>
              <span className="mdn-today-label">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>

            {loading ? (
              <div className="mdn-sk-col">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="mdn-sk-sched">
                    <Sk w={10} h={10} r={50} />
                    <div className="mdn-sk-col-inner">
                      <Sk w="110px" />
                      <Sk w="80px" h={11} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.todaysSchedule?.length ? (
              <div className="mdn-empty mdn-empty-sm">
                <CalendarDays size={28} />
                <p>No meetings scheduled today.</p>
              </div>
            ) : (
              <div className="mdn-sched-list">
                {data.todaysSchedule.map((m, i) => {
                  const colors = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED"];
                  return (
                    <div key={m._id || i} className="mdn-sched-item">
                      <span className="mdn-sched-dot" style={{ background: colors[i % colors.length] }} />
                      <div className="mdn-sched-info">
                        <p className="mdn-sched-time">{formatTime(m.startTime)}{m.endTime ? ` – ${formatTime(m.endTime)}` : ""}</p>
                        <p className="mdn-sched-name">{m.meetingTitle || m.meetingType || "Meeting"}</p>
                        {m.caseId?.caseId && (
                          <p className="mdn-sched-meta">{m.caseId.caseId}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="mdn-goto-btn" onClick={() => navigate("/mediator/meetings")}>
              View All Meetings
            </button>
          </div>
        </div>

        {/* ── Bottom row: messages + appointments ── */}
        <div className="mdn-bottom-row">

          {/* Recent Messages */}
          <div className="mdn-card mdn-messages-card">
            <div className="mdn-card-header">
              <h2 className="mdn-card-title">Recent Messages</h2>
            </div>

            {loading ? (
              <div className="mdn-sk-col">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="mdn-sk-msg">
                    <Sk w={38} h={38} r={50} />
                    <div className="mdn-sk-col-inner">
                      <Sk w="120px" />
                      <Sk w="160px" h={11} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.recentMessages?.length ? (
              <div className="mdn-empty mdn-empty-sm">
                <MessageCircle size={28} />
                <p>No messages yet.</p>
              </div>
            ) : (
              <div className="mdn-msg-list">
                {data.recentMessages.map((conv) => {
                  const name     = peerName(conv.participants);
                  const initials = peerInitials(name);
                  const preview  = conv.lastMessage?.text || "No messages yet";
                  const time     = msgTime(conv.lastMessage?.sentAt || conv.updatedAt);
                  return (
                    <div key={conv._id} className="mdn-msg-item" onClick={() => navigate("/mediator/messages")}>
                      <div className="mdn-msg-avatar">{initials}</div>
                      <div className="mdn-msg-body">
                        <div className="mdn-msg-top">
                          <span className="mdn-msg-name">{name}</span>
                          <span className="mdn-msg-time">{time}</span>
                        </div>
                        <p className="mdn-msg-preview">{preview}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="mdn-goto-btn" onClick={() => navigate("/mediator/messages")}>
              Go to Messenger →
            </button>
          </div>

          {/* Upcoming Appointments */}
          <div className="mdn-card mdn-appt-card">
            <div className="mdn-card-header">
              <h2 className="mdn-card-title">Upcoming Appointments</h2>
            </div>

            {loading ? (
              <div className="mdn-sk-col">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="mdn-sk-appt">
                    <Sk w={48} h={52} r={10} />
                    <div className="mdn-sk-col-inner">
                      <Sk w="130px" />
                      <Sk w="90px" h={11} />
                      <Sk w="80px" h={28} r={8} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.upcomingAppointments?.length ? (
              <div className="mdn-empty mdn-empty-sm">
                <Video size={28} />
                <p>No upcoming appointments.</p>
              </div>
            ) : (
              <div className="mdn-appt-list">
                {data.upcomingAppointments.map((m) => {
                  const d = formatDate(m.scheduledDate);
                  const joinable = m.locationType === "virtual" && m.virtualMeeting?.meetingLink;
                  return (
                    <div key={m._id} className="mdn-appt-item">
                      <div className="mdn-appt-date">
                        <span className="mdn-appt-month">{d.month}</span>
                        <span className="mdn-appt-day">{d.day}</span>
                      </div>
                      <div className="mdn-appt-info">
                        <p className="mdn-appt-title">
                          {m.caseId?.caseId && <span className="mdn-appt-caseid">{m.caseId.caseId}</span>}
                          {" "}{m.caseId?.caseTitle || m.meetingTitle || m.meetingType || "Meeting"}
                        </p>
                        <p className="mdn-appt-time">
                          {formatTime(m.startTime)}{m.endTime ? ` – ${formatTime(m.endTime)}` : ""}
                        </p>
                        {joinable ? (
                          <a
                            href={m.virtualMeeting.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mdn-join-btn"
                          >
                            Join Meeting
                          </a>
                        ) : (
                          <button
                            className="mdn-details-btn"
                            onClick={() => navigate("/mediator/meetings")}
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorDashboard;
