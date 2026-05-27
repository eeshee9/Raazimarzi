// src/pages/MeetingCall.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./UserMeetingCall.css";

const avatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=778aff&color=fff&size=200`;

/* ─── Sidebar panel tabs ─── */
const TABS = ["MEETING CHAT", "NOTES", "DOCUMENTS"];

const MeetingCall = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [meeting,    setMeeting]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [panel,      setPanel]      = useState(null);       // null | "MEETING CHAT" | "NOTES" | "DOCUMENTS"
  const [muted,      setMuted]      = useState(false);
  const [camOff,     setCamOff]     = useState(false);
  const [recording,  setRecording]  = useState(true);
  const [elapsed,    setElapsed]    = useState(0);          // seconds since joined

  // Chat
  const [chatMsg,    setChatMsg]    = useState("");
  const [chatLog,    setChatLog]    = useState([]);
  const chatEndRef = useRef();

  // Notes
  const [note,       setNote]       = useState("");
  const [noteSaved,  setNoteSaved]  = useState(false);
  const noteSaveTimer = useRef();

  // End session state
  const [ending,     setEnding]     = useState(false);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/meetings/${id}`);
        setMeeting(res.data.meeting);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  // Auto-save notes
  const handleNoteChange = (val) => {
    setNote(val);
    setNoteSaved(false);
    clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => setNoteSaved(true), 2000);
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    const now = new Date();
    setChatLog((prev) => [
      ...prev,
      {
        sender: "You",
        text:   chatMsg.trim(),
        time:   `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} ${now.getHours() >= 12 ? "PM" : "AM"}`,
        self:   true,
      },
    ]);
    setChatMsg("");
  };

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end this session?")) return;
    setEnding(true);
    try {
      await api.patch(`/meetings/${id}/complete`, {
        summary:          note || "Session completed",
        agreementReached: false,
        meetingNotes:     note,
      });
    } catch (_) { /* if not authorized to complete, just navigate */ }
    navigate(`/user/meetings/summary/${id}`);
  };

  if (loading) return (
    <div className="call-loading">
      <div className="call-spinner" />
      <p>Connecting to session…</p>
    </div>
  );

  const caseTitle  = meeting?.caseId?.caseTitle || meeting?.meetingTitle || "Case Session";
  const sessionId  = meeting?._id?.slice(-4) || "0000";
  const mediator   = meeting?.mediator;
  const parts      = meeting?.participants || [];

  // Build video tiles: mediator (large) + participants
  const mainParticipant = mediator || { name: "Mediator", _id: "med" };
  const sideParts       = parts.slice(0, 2);

  const docs = [
    { name: "Lease_Agreement_2022.pdf",  icon: "📄", time: "Uploaded yesterday"  },
    { name: "Evidence_Photo_HVAC.jpg",   icon: "🖼️", time: "Uploaded 2 days ago" },
    { name: "Payment_Ledger.xlsx",       icon: "📊", time: "Uploaded 3 days ago" },
  ];

  return (
    <div className="call-root">
      {/* ── Sidebar ── */}
      <div className="call-sidebar">
        <div className="call-sidebar-logo">RM</div>
        <nav className="call-sidebar-nav">
          {["🏠","📁","⚖️","👥","💬","📄","💳","🤝","👤"].map((ic, i) => (
            <button key={i} className="call-nav-btn">{ic}</button>
          ))}
        </nav>
        <button className="call-nav-btn call-nav-logout">🚪</button>
      </div>

      {/* ── Main area ── */}
      <div className="call-main">
        {/* Header */}
        <div className="call-header">
          <div className="call-header-left">
            <h2 className="call-case-title">
              {caseTitle} | <span className="call-case-num">#{sessionId}</span>
            </h2>
            {recording && (
              <span className="call-recording-badge">
                <span className="call-rec-dot" /> RECORDING
              </span>
            )}
          </div>
          <div className="call-timer">{fmtElapsed(elapsed)}</div>
        </div>

        {/* Video grid */}
        <div className="call-videos">
          {/* Main tile — mediator */}
          <div className="call-video-main">
            <img
              src={mainParticipant.avatar || avatar(mainParticipant.name)}
              alt={mainParticipant.name}
              className="call-video-img"
            />
            <span className="call-video-label">
              🎙️ {mainParticipant.name} (Mediator)
            </span>
            {panel && (
              <div className="call-panel-inline">
                {/* panel rendered below videos on mobile; here shown as overlay on main tile */}
              </div>
            )}
          </div>

          {/* Side tiles */}
          <div className="call-video-side">
            {sideParts.length > 0 ? (
              sideParts.map((p, i) => (
                <div key={i} className="call-video-tile">
                  <img
                    src={p.user?.avatar || avatar(p.name || p.user?.name)}
                    alt={p.name}
                    className="call-video-img"
                  />
                  <span className="call-video-label">
                    {p.muted ? "🔇" : "🎙️"} {p.name || p.user?.name} ({p.role})
                  </span>
                </div>
              ))
            ) : (
              // Placeholder tiles when no participants yet
              ["Petitioner","Respondent"].map((role, i) => (
                <div key={i} className="call-video-tile call-video-empty">
                  <span className="call-video-placeholder-icon">👤</span>
                  <span className="call-video-label call-video-label-empty">{role}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="call-controls">
          <button
            className={`call-ctrl ${muted ? "call-ctrl-active" : ""}`}
            onClick={() => setMuted((v) => !v)}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🎙️"}
            <span>MUTE</span>
          </button>
          <button
            className={`call-ctrl ${camOff ? "call-ctrl-active" : ""}`}
            onClick={() => setCamOff((v) => !v)}
            title="Camera"
          >
            {camOff ? "📷" : "📸"}
            <span>CAMERA</span>
          </button>
          <button className="call-ctrl" title="Share screen">
            📤<span>SHARE</span>
          </button>
          <button className="call-ctrl" title="Participants">
            👥<span>PARTICIPANTS</span>
          </button>
          <button
            className="call-ctrl call-ctrl-end"
            onClick={handleEndSession}
            disabled={ending}
            title="End session"
          >
            📵<span>END</span>
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="call-right-panel">
        {/* Tab bar */}
        <div className="call-panel-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`call-panel-tab ${panel === t ? "active" : ""}`}
              onClick={() => setPanel((prev) => prev === t ? null : t)}
            >
              <span className="call-panel-tab-icon">
                {t === "MEETING CHAT" ? "💬" : t === "NOTES" ? "📝" : "📁"}
              </span>
              <span className="call-panel-tab-label">{t}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="call-panel-body">
          {/* ── CHAT ── */}
          {panel === "MEETING CHAT" && (
            <div className="call-chat">
              <div className="call-chat-messages">
                {chatLog.length === 0 && (
                  <p className="call-chat-empty">No messages yet. Say hello!</p>
                )}
                {/* Seed a message from mediator if available */}
                {mediator && chatLog.length === 0 && (
                  <div className="call-chat-msg call-chat-other">
                    <div className="call-chat-avatar">
                      {(mediator.name || "M").charAt(0).toUpperCase()}
                    </div>
                    <div className="call-chat-bubble">
                      <p>Welcome to the session. Please refer to the case documents before we begin.</p>
                      <span className="call-chat-time">10:42 AM</span>
                    </div>
                  </div>
                )}
                {chatLog.map((msg, i) => (
                  <div key={i} className={`call-chat-msg ${msg.self ? "call-chat-self" : "call-chat-other"}`}>
                    {!msg.self && (
                      <div className="call-chat-avatar">
                        {(msg.sender || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="call-chat-bubble">
                      <p>{msg.text}</p>
                      <span className="call-chat-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="call-chat-input">
                <input
                  placeholder="Type a message..."
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />
                <button onClick={sendChat} disabled={!chatMsg.trim()}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 2L2 7l5 2 2 5 5-12z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── NOTES ── */}
          {panel === "NOTES" && (
            <div className="call-notes">
              <div className="call-notes-header">
                <span>MAKE YOUR PERSONAL NOTES</span>
                <button className="call-notes-add">＋</button>
              </div>
              <div className="call-notes-card">
                <p className="call-notes-label">COMMENTS BY {(meeting?.caseId?.caseTitle || "YOU").toUpperCase()}</p>
                <textarea
                  className="call-notes-area"
                  placeholder="Start typing your notes..."
                  value={note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                />
                <div className="call-notes-footer">
                  <span className="call-notes-autosave">
                    {noteSaved ? "✓ Auto saved" : "Auto saves in 2s…"}
                  </span>
                  <button
                    className="call-notes-save-btn"
                    onClick={() => setNoteSaved(true)}
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="call-notes-list">
                <div className="call-notes-entry">
                  <span>COMMENTS BY PETITIONER</span>
                  <button>✏️</button>
                </div>
                <div className="call-notes-entry">
                  <span>COMMENTS FROM MEDIATOR</span>
                  <button>✏️</button>
                </div>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {panel === "DOCUMENTS" && (
            <div className="call-docs">
              <div className="call-docs-header">
                <span>RECENT DOCUMENTS</span>
                <button className="call-notes-add">＋</button>
              </div>
              <div className="call-docs-list">
                {docs.map((doc, i) => (
                  <div key={i} className="call-doc-item">
                    <span className="call-doc-icon">{doc.icon}</span>
                    <div>
                      <p className="call-doc-name">{doc.name}</p>
                      <p className="call-doc-time">{doc.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Default (no tab selected) ── */}
          {panel === null && (
            <div className="call-panel-hint">
              <p>Select a tab above to view Chat, Notes, or Documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMeetingCall;
