// src/pages/MediatorMeetings.js — Full mediator meetings list
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Calendar, Clock, RefreshCw, VideoOff } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorMeetings.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt12h = (hhmm) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr   = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const fmtMonth = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const fmtDuration = (mins) => {
  if (!mins) return "—";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h !== 1 ? "s" : ""}`;
};

const getInitials = (name) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const STATUS_CFG = {
  "Scheduled":   { bg: "#EFF6FF", color: "#2563EB", dot: "#60A5FA" },
  "Confirmed":   { bg: "#ECFDF5", color: "#16A34A", dot: "#4ADE80" },
  "In Progress": { bg: "#FFF7ED", color: "#D97706", dot: "#FB923C" },
  "Completed":   { bg: "#F0FDF4", color: "#15803D", dot: "#86EFAC" },
  "Rescheduled": { bg: "#F5F3FF", color: "#7C3AED", dot: "#A78BFA" },
  "No Show":     { bg: "#FEF2F2", color: "#DC2626", dot: "#FCA5A5" },
  "Cancelled":   { bg: "#F9FAFB", color: "#6B7280", dot: "#D1D5DB" },
};

const CASE_TYPE_LABEL = {
  property:   "Property Dispute",
  rental:     "Rental Dispute",
  consumer:   "Consumer Dispute",
  individual: "Individual Dispute",
  commercial: "Commercial Dispute",
};

// Extract the two parties from a meeting object
const getParties = (meeting) => {
  const c = meeting.caseId;

  // Try participants array first (has role labels)
  const petPart = meeting.participants?.find(
    (p) => p.role === "petitioner" || p.role === "claimant"
  );
  const respPart = meeting.participants?.find(
    (p) => p.role === "defendant" || p.role === "respondent"
  );

  const party1 = {
    name:   petPart?.user?.name  || petPart?.name  || c?.petitionerDetails?.fullName || "Party 1",
    avatar: petPart?.user?.avatar || null,
    label:  "Petitioner",
  };

  const party2 = {
    name:   respPart?.user?.name  || respPart?.name  || c?.respondent?.name || c?.defendantDetails?.fullName || "Party 2",
    avatar: respPart?.user?.avatar || null,
    label:  "Respondent",
  };

  return { party1, party2 };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PartyChip = ({ party }) => (
  <div className="mm-party-chip">
    {party.avatar
      ? <img src={party.avatar} alt={party.name} className="mm-chip-avatar" />
      : <div className="mm-chip-avatar mm-chip-initials">{getInitials(party.name)}</div>
    }
    <div className="mm-chip-info">
      <p className="mm-chip-name">{party.name}</p>
      <p className="mm-chip-role">{party.label}</p>
    </div>
  </div>
);

const MeetingRow = ({ meeting, onJoin }) => {
  const { party1, party2 } = getParties(meeting);
  const c        = meeting.caseId;
  const scfg     = STATUS_CFG[meeting.status] || STATUS_CFG["Scheduled"];
  const catLabel = c?.caseType ? (CASE_TYPE_LABEL[c.caseType] || c.caseType) : "—";
  const isLive   = meeting.status === "In Progress";
  const isDone   = ["Completed", "Cancelled", "No Show"].includes(meeting.status);

  return (
    <div className={`mm-row${isLive ? " mm-row-live" : ""}${isDone ? " mm-row-done" : ""}`}>
      <div className={`mm-row-accent${isLive ? " mm-accent-live" : ""}`} />

      <div className="mm-col-time">
        <span className="mm-time-val">{fmt12h(meeting.startTime)}</span>
        <span className="mm-time-dur">{fmtDuration(meeting.duration)}</span>
      </div>

      <div className="mm-row-divider" />
      <PartyChip party={party1} />
      <div className="mm-row-divider" />
      <PartyChip party={party2} />
      <div className="mm-row-divider" />

      <div className="mm-col-cat">
        <span className="mm-cat-label">Category</span>
        <span className="mm-cat-val">{catLabel}</span>
        {c?.caseId && <span className="mm-cat-id">#{c.caseId}</span>}
      </div>

      <div className="mm-col-status">
        <span
          className="mm-status-dot"
          style={{ background: scfg.dot }}
        />
        <span style={{ color: scfg.color, fontSize: 12, fontWeight: 500 }}>{meeting.status}</span>
      </div>

      <button
        className={`mm-join-btn${isLive ? " mm-join-live" : ""}${isDone ? " mm-join-done" : ""}`}
        onClick={() => onJoin(meeting)}
        disabled={isDone}
      >
        {isDone ? "Ended" : isLive ? "Rejoin" : "Join Now"}
      </button>
    </div>
  );
};

const UpcomingCard = ({ meeting, onJoin }) => {
  const c = meeting.caseId;
  return (
    <div className="mm-upc-card" onClick={() => onJoin(meeting)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onJoin(meeting)}>
      <div className="mm-upc-icon">
        <Users size={22} color="#7C3AED" />
      </div>
      <div className="mm-upc-body">
        <p className="mm-upc-cid">
          Case ID: {c?.caseId ? <span className="mm-upc-ref">#{c.caseId}</span> : "—"}
        </p>
        <p className="mm-upc-date">{fmtDate(meeting.scheduledDate)}</p>
        <p className="mm-upc-time">
          {fmt12h(meeting.startTime)}
          {meeting.endTime ? ` – ${fmt12h(meeting.endTime)}` : ""}
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MediatorMeetings = () => {
  const navigate = useNavigate();

  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [todayMeetings,    setTodayMeetings]    = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [search,           setSearch]           = useState("");
  const [debouncedSearch,  setDebouncedSearch]  = useState("");

  const searchTimer = useRef(null);

  const fetchMeetings = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : "";
      const res    = await axiosInstance.get(`/mediator/meetings${params}`);
      setTodayMeetings(res.data.todayMeetings || []);
      setUpcomingMeetings(res.data.upcomingMeetings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      fetchMeetings(search);
    }, 380);
    return () => clearTimeout(searchTimer.current);
  }, [search, fetchMeetings]);

  const handleJoin = (meeting) => {
    // Navigate to the meeting room page
    navigate(`/mediator/meetings/${meeting._id}`);
  };

  // Topbar search
  const topbarLeft = (
    <div className="mm-search-wrap">
      <Search size={15} className="mm-search-icon" />
      <input
        type="text"
        className="mm-search-input"
        placeholder="Search cases, mediators or meetings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <button className="mm-search-clear" onClick={() => setSearch("")}>×</button>
      )}
    </div>
  );

  // Group upcoming by month
  const upcomingByMonth = upcomingMeetings.reduce((acc, m) => {
    const key = fmtMonth(m.scheduledDate);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <MediatorLayout topbarLeft={topbarLeft}>
      <div className="mm-page">

        {/* Loading */}
        {loading && (
          <div className="mm-fullstate">
            <RefreshCw size={22} className="mm-spin" />
            <p>Loading meetings…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mm-fullstate mm-error">
            <VideoOff size={36} />
            <p>{error}</p>
            <button className="mm-retry-btn" onClick={() => fetchMeetings(search)}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Today's Meetings ── */}
            <section className="mm-section">
              <h2 className="mm-section-h">
                Today's Meetings
                {todayMeetings.length > 0 && (
                  <span className="mm-count">{todayMeetings.length}</span>
                )}
              </h2>

              {todayMeetings.length === 0 ? (
                <div className="mm-empty-row">
                  <Calendar size={18} />
                  <span>
                    {debouncedSearch
                      ? "No today's meetings match your search."
                      : "No meetings scheduled for today."}
                  </span>
                </div>
              ) : (
                <div className="mm-rows">
                  {todayMeetings.map((m) => (
                    <MeetingRow key={m._id} meeting={m} onJoin={handleJoin} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Upcoming Meetings ── */}
            {Object.keys(upcomingByMonth).length === 0 ? (
              <section className="mm-section">
                <h2 className="mm-section-h">Upcoming Meetings</h2>
                <div className="mm-empty-row">
                  <Clock size={18} />
                  <span>
                    {debouncedSearch
                      ? "No upcoming meetings match your search."
                      : "No upcoming meetings scheduled."}
                  </span>
                </div>
              </section>
            ) : (
              Object.entries(upcomingByMonth).map(([month, meetings]) => (
                <section key={month} className="mm-section">
                  <h2 className="mm-section-h">
                    Upcoming Meetings
                    <span className="mm-month-label">({month})</span>
                    <span className="mm-count">{meetings.length}</span>
                  </h2>
                  <div className="mm-upc-grid">
                    {meetings.map((m) => (
                      <UpcomingCard key={m._id} meeting={m} onJoin={handleJoin} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </MediatorLayout>
  );
};

export default MediatorMeetings;
