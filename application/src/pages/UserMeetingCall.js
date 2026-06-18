// src/pages/UserMeetingCall.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import UserSidebar from "../components/UserSidebar";
import {
  FaMicrophone,
  FaVideo,
  FaUsers, FaPhoneSlash,
  FaCommentDots, FaStickyNote, FaFolderOpen,
  FaTimes, FaPlus, FaStar, FaCheckCircle,
  FaFilePdf, FaFileImage, FaFile, FaPen,
  FaEye, FaExternalLinkAlt,
} from "react-icons/fa";
import { MdScreenShare } from "react-icons/md";
import "./UserMeetingCall.css";

/* ─── Constants ────────────────────────────────────────────────── */
const TABS = [
  { id: "MEETING CHAT", label: "MEETING CHAT", Icon: FaCommentDots },
  { id: "NOTES",        label: "NOTES",         Icon: FaStickyNote  },
  { id: "DOCUMENTS",    label: "DOCUMENTS",      Icon: FaFolderOpen  },
];

/* ─── Helpers ──────────────────────────────────────────────────── */
const fmtElapsed = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const fmtDuration = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${secs % 60}s`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)           return "just now";
  if (diff < 3600)         return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)        return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2)    return "yesterday";
  return `${Math.floor(diff / 86400)} days ago`;
};

const avatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=778aff&color=fff&size=200`;

const DocIcon = ({ name = "" }) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FaFilePdf  className="call-doc-type-icon call-doc-type-icon--pdf" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <FaFileImage className="call-doc-type-icon call-doc-type-icon--img" />;
  return <FaFile className="call-doc-type-icon" />;
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const MeetingCall = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  /* ── Meeting data ── */
  const [meeting,  setMeeting]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  /* ── Controls ── */
  const [elapsed, setElapsed] = useState(0);

  /* ── Panel ── */
  const [panel, setPanel] = useState("MEETING CHAT");

  /* ── Chat ── */
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatLoading,  setChatLoading]  = useState(true);
  const chatEndRef  = useRef();
  const socketRef   = useRef(null);

  /* ── Notes ── */
  const [notes,           setNotes]           = useState([]);
  const [noteContent,     setNoteContent]     = useState("");
  const [activeNoteId,    setActiveNoteId]    = useState(null);
  const [noteSaveText,    setNoteSaveText]    = useState("");
  const [editingNoteId,   setEditingNoteId]   = useState(null); // for editing other-user notes
  const noteSaveTimer = useRef();

  /* ── Documents ── */
  const [docs, setDocs] = useState([]);

  /* ── Session completion ── */
  const [completed,     setCompleted]     = useState(false);
  const [completedData, setCompletedData] = useState(null);
  const [ending,        setEnding]        = useState(false);

  /* ── Feedback ── */
  const [fbRating,      setFbRating]      = useState(0);
  const [fbHover,       setFbHover]       = useState(0);
  const [fbComment,     setFbComment]     = useState("");
  const [fbSubmitting,  setFbSubmitting]  = useState(false);
  const [fbDone,        setFbDone]        = useState(false);

  /* ── User info ── */
  const userId   = localStorage.getItem("userId") || "";
  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").name || localStorage.getItem("userName") || "You"; }
    catch { return localStorage.getItem("userName") || "You"; }
  })();

  /* ─── Timer ── */
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Load meeting ── */
  useEffect(() => {
    api.get(`/meetings/${id}`)
      .then((res) => setMeeting(res.data.meeting))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Load chat messages ── */
  useEffect(() => {
    setChatLoading(true);
    api.get(`/meeting-messages/meeting/${id}`)
      .then((res) => setChatMessages(res.data.messages || []))
      .catch(() => {})
      .finally(() => setChatLoading(false));
  }, [id]);

  /* ── Load notes ── */
  useEffect(() => {
    api.get(`/meeting-notes/meeting/${id}`)
      .then((res) => {
        const loaded = res.data.notes || [];
        setNotes(loaded);
        const mine = loaded.find(
          (n) => (n.authorId?._id || n.authorId)?.toString() === userId
        );
        if (mine) {
          setActiveNoteId(mine._id);
          setNoteContent(mine.content || "");
        }
      })
      .catch(() => {});
  }, [id, userId]);

  /* ── Load documents (from case) ── */
  useEffect(() => {
    if (!meeting) return;
    const caseId = meeting.caseId?._id || meeting.caseId;
    if (!caseId) return;
    api.get(`/documents/case/${caseId}`)
      .then((res) => setDocs(res.data.documents || []))
      .catch(() => {});
  }, [meeting]);

  /* ── Socket.IO ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    const baseUrl = apiUrl.replace(/\/api\/?$/, "");
    const s = io(baseUrl, { auth: { token }, transports: ["websocket", "polling"] });
    s.emit("joinRoom", `meeting:${id}`);
    s.on("receiveMessage", (msg) => {
      // Only add if it's not from self (self message already added locally)
      if (msg.senderId !== userId && msg.senderName !== userName) {
        setChatMessages((prev) => [...prev, { ...msg, _remote: true }]);
      }
    });
    socketRef.current = s;
    return () => { s.close(); socketRef.current = null; };
  }, [id, userId, userName]);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ─── Send chat message ── */
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    const now = new Date();
    // Optimistic local message
    setChatMessages((prev) => [
      ...prev,
      { _localId: Date.now(), senderName: userName, text, createdAt: now.toISOString(), _self: true },
    ]);
    // Broadcast via socket
    socketRef.current?.emit("sendMessage", {
      roomId:  `meeting:${id}`,
      message: { senderName: userName, senderId: userId, text, createdAt: now.toISOString() },
    });
    // Persist to backend
    api.post(`/meeting-messages/meeting/${id}`, { text }).catch(() => {});
  };

  /* ── Notes: save (debounced autosave + manual save) ── */
  const handleNoteChange = (val) => {
    setNoteContent(val);
    setNoteSaveText("Saving…");
    clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => persistNote(val), 2000);
  };

  const persistNote = useCallback(async (content) => {
    try {
      const caseId = meeting?.caseId?._id || meeting?.caseId;
      const res = await api.post(`/meeting-notes/meeting/${id}`, { content, caseId });
      const saved = res.data.note;
      setActiveNoteId(saved._id);
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n._id === saved._id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = saved; return copy; }
        return [...prev, saved];
      });
      const sec = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setNoteSaveText(`Auto saved ${sec}`);
    } catch { setNoteSaveText("Save failed"); }
  }, [id, meeting]);

  const handleManualSave = () => {
    clearTimeout(noteSaveTimer.current);
    persistNote(noteContent);
  };

  /* ── End session ── */
  const handleEndSession = async () => {
    if (!window.confirm("End this session for all participants?")) return;
    setEnding(true);
    const durationSecs = elapsed;
    try {
      await api.patch(`/meetings/${id}/complete`, {
        summary:          noteContent || "Session completed",
        agreementReached: false,
        meetingNotes:     noteContent,
      });
    } catch (_) { /* may fail if not authorized — show completion screen anyway */ }
    setCompletedData({ duration: durationSecs, completedAt: new Date() });
    setCompleted(true);
    setEnding(false);
  };

  /* ── Submit feedback ── */
  const handleFeedbackSubmit = async () => {
    if (!fbRating) return;
    setFbSubmitting(true);
    try {
      await api.post(`/meetings/${id}/feedback`, { rating: fbRating, comment: fbComment });
      setFbDone(true);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to submit feedback");
    } finally {
      setFbSubmitting(false);
    }
  };

  /* ─────────────────────────────────────────────────────────
     SESSION COMPLETED SCREEN
  ───────────────────────────────────────────────────────── */
  if (completed && completedData) {
    const caseTitle    = meeting?.caseId?.caseTitle || meeting?.meetingTitle || "Mediation Session";
    const recordingUrl = meeting?.recording?.recordingUrl;

    return (
      <div className="call-completed-page">
        <div className="call-completed-scroll">

          {/* ── Success icon ── */}
          <div className="call-completed-icon-wrap">
            <FaCheckCircle className="call-completed-icon" />
          </div>
          <h1 className="call-completed-title">Session Completed</h1>
          <p className="call-completed-sub">
            Your mediation session has concluded successfully.<br />
            Thank you for your commitment to a peaceful resolution.
          </p>

          {/* ── Session summary card ── */}
          <div className="call-session-summary">
            <p className="call-ss-heading">SESSION SUMMARY</p>

            <p className="call-ss-field-label">Case Title</p>
            <p className="call-ss-case-title">{caseTitle}</p>

            <div className="call-ss-meta">
              <div>
                <p className="call-ss-field-label">Duration</p>
                <p className="call-ss-field-val">{fmtDuration(completedData.duration)}</p>
              </div>
              <div>
                <p className="call-ss-field-label">Date</p>
                <p className="call-ss-field-val">{fmtDate(completedData.completedAt)}</p>
              </div>
            </div>

            <button
              className={`call-view-rec-btn${!recordingUrl ? " call-view-rec-btn--disabled" : ""}`}
              disabled={!recordingUrl}
              onClick={() => recordingUrl && window.open(recordingUrl, "_blank")}
            >
              <FaEye /> View Recorded Session
            </button>
          </div>

          <div className="call-completed-divider" />

          {/* ── Feedback section ── */}
          {!fbDone ? (
            <div className="call-fb-section">
              <h2 className="call-fb-title">How was your experience today?</h2>
              <p className="call-fb-sub">Your feedback helps us provide a better sanctuary for resolution.</p>

              <div className="call-fb-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <FaStar
                    key={n}
                    className={`call-fb-star${n <= (fbHover || fbRating) ? " call-fb-star--filled" : ""}`}
                    onMouseEnter={() => setFbHover(n)}
                    onMouseLeave={() => setFbHover(0)}
                    onClick={() => setFbRating(n)}
                  />
                ))}
              </div>

              <textarea
                className="call-fb-comment"
                placeholder="Optional: Share your thoughts about the session or the platform…"
                value={fbComment}
                onChange={(e) => setFbComment(e.target.value)}
                rows={4}
              />

              <button
                className="call-back-dash-btn"
                disabled={fbSubmitting}
                onClick={fbRating ? handleFeedbackSubmit : () => navigate("/user/dashboard")}
              >
                {fbSubmitting ? "Submitting…" : "Back to Dashboard"}
              </button>
            </div>
          ) : (
            <div className="call-fb-done">
              <FaCheckCircle className="call-fb-done-icon" />
              <p>Thank you for your feedback!</p>
              <button className="call-back-dash-btn" onClick={() => navigate("/user/dashboard")}>
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     LOADING STATE
  ───────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="call-loading">
        <div className="call-spinner" />
        <p>Loading session…</p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     DERIVED VALUES
  ───────────────────────────────────────────────────────── */
  const caseTitle  = meeting?.caseId?.caseTitle || meeting?.meetingTitle || "Case Session";
  const sessionNum = meeting?._id?.slice(-4) || "0000";
  const mediator   = meeting?.mediator;
  const parts      = meeting?.participants || [];
  const recording  = meeting?.recording?.isRecorded ?? true;

  const mainParticipant = mediator || { name: "Mediator" };
  const sideParts       = parts.slice(0, 2);

  /* ── User's own note ── */
  const myNote = notes.find(
    (n) => (n.authorId?._id || n.authorId)?.toString() === userId
  );
  const otherNotes = notes.filter(
    (n) => (n.authorId?._id || n.authorId)?.toString() !== userId
  );

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div className="call-root">
      {/* ── Left sidebar ── */}
      <UserSidebar activePage="meetings" />

      {/* ── Main call area ── */}
      <div className="call-main">

        {/* Header */}
        <div className="call-header">
          <div className="call-header-left">
            <h2 className="call-case-title">
              {caseTitle} <span className="call-case-sep">|</span>
              <span className="call-case-num"> #{sessionNum}</span>
            </h2>
            {recording && (
              <span className="call-recording-badge">
                <span className="call-rec-dot" /> RECORDING
              </span>
            )}
          </div>
          <div className="call-timer">
            <span className="call-timer-dot" />
            {fmtElapsed(elapsed)}
          </div>
        </div>

        {/* Video grid */}
        <div className="call-videos">
          {/* Main tile — mediator */}
          <div className="call-video-main">
            <img
              src={mainParticipant.avatar || avatarUrl(mainParticipant.name || "Mediator")}
              alt={mainParticipant.name}
              className="call-video-img"
            />
            <div className="call-video-badge call-video-badge--main">MEDIATOR</div>
            <span className="call-video-label">
              <span className="call-mic-icon">🎙</span>
              {mainParticipant.name || "Mediator"} (Mediator)
            </span>
          </div>

          {/* Side tiles */}
          <div className="call-video-side">
            {sideParts.length > 0 ? (
              sideParts.map((p, i) => {
                const pName = p.name || p.user?.name || "Participant";
                return (
                  <div key={i} className="call-video-tile">
                    <img
                      src={p.user?.avatar || avatarUrl(pName)}
                      alt={pName}
                      className="call-video-img"
                    />
                    <span className="call-video-label">
                      <span className="call-mic-icon">{p.muted ? "🔇" : "🎙"}</span>
                      {pName} ({p.role || "Participant"})
                    </span>
                  </div>
                );
              })
            ) : (
              ["Petitioner", "Respondent"].map((role, i) => (
                <div key={i} className="call-video-tile call-video-empty">
                  <span className="call-video-placeholder-icon">👤</span>
                  <span className="call-video-label-empty">{role}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls bar */}
        <div className="call-controls">
          <button
            className="call-ctrl"
            disabled
            title="Microphone control unavailable — live audio not yet implemented"
          >
            <FaMicrophone />
            <span>MUTE</span>
          </button>

          <button
            className="call-ctrl"
            disabled
            title="Camera control unavailable — live video not yet implemented"
          >
            <FaVideo />
            <span>CAMERA</span>
          </button>

          <button
            className="call-ctrl"
            disabled
            title="Screen sharing not yet implemented"
          >
            <MdScreenShare />
            <span>SHARE</span>
          </button>

          <button className="call-ctrl" title="Participants">
            <FaUsers />
            <span>PARTICIPANTS</span>
          </button>

          <button
            className="call-ctrl call-ctrl--end"
            onClick={handleEndSession}
            disabled={ending}
            title="End session"
          >
            <FaPhoneSlash />
            <span>END</span>
          </button>
        </div>
      </div>

      {/* ── Right: icon strip (when panel closed) ── */}
      {!panel && (
        <div className="call-panel-opener">
          {TABS.map(({ id: tabId, label, Icon }) => (
            <button
              key={tabId}
              className="call-panel-opener-btn"
              onClick={() => setPanel(tabId)}
              title={label}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Right: full panel ── */}
      {panel && (
        <div className="call-right-panel">
          {/* Tab header */}
          <div className="call-panel-tabs">
            {TABS.map(({ id: tabId, label, Icon }) => (
              <button
                key={tabId}
                className={`call-panel-tab${panel === tabId ? " active" : ""}`}
                onClick={() => setPanel(tabId)}
              >
                <Icon className="call-panel-tab-icon" />
                <span className="call-panel-tab-label">{label}</span>
              </button>
            ))}
            <button className="call-panel-close-btn" onClick={() => setPanel(null)} title="Close panel">
              <FaTimes />
            </button>
          </div>

          {/* ── MEETING CHAT ── */}
          {panel === "MEETING CHAT" && (
            <div className="call-chat">
              <div className="call-chat-messages">
                {chatLoading && <p className="call-chat-empty">Loading messages…</p>}
                {!chatLoading && chatMessages.length === 0 && (
                  <p className="call-chat-empty">No messages yet. Say hello!</p>
                )}
                {chatMessages.map((msg, i) => {
                  const isSelf =
                    msg._self ||
                    (msg.sender?._id || msg.sender)?.toString() === userId ||
                    msg.senderName === userName;
                  const initials = (msg.senderName || msg.sender?.name || "?").charAt(0).toUpperCase();
                  return (
                    <div
                      key={msg._id || msg._localId || i}
                      className={`call-chat-msg${isSelf ? " call-chat-self" : " call-chat-other"}`}
                    >
                      {!isSelf && (
                        <div className="call-chat-avatar">{initials}</div>
                      )}
                      <div className="call-chat-bubble">
                        <p>{msg.text}</p>
                        <span className="call-chat-time">{fmtTime(msg.createdAt || msg.sentAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="call-chat-input-row">
                <input
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                />
                <button onClick={sendChat} disabled={!chatInput.trim()} title="Send">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M14 2L2 7l5 2 2 5 5-12z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── NOTES ── */}
          {panel === "NOTES" && (
            <div className="call-notes">
              {/* Header */}
              <div className="call-notes-header">
                <span>MAKE YOUR PERSONAL NOTES</span>
                <button
                  className="call-notes-add-btn"
                  onClick={() => { setNoteContent(""); setActiveNoteId(null); }}
                  title="New note"
                >
                  <FaPlus />
                </button>
              </div>

              {/* Active note card */}
              <div className="call-notes-card">
                <p className="call-notes-card-label">
                  COMMENTS BY {userName.toUpperCase()}
                </p>
                <textarea
                  className="call-notes-textarea"
                  placeholder="Start typing your notes…"
                  value={noteContent}
                  onChange={(e) => handleNoteChange(e.target.value)}
                />
                <div className="call-notes-card-footer">
                  <span className="call-notes-autosave">{noteSaveText || "Auto saves as you type"}</span>
                  <button className="call-notes-save-btn" onClick={handleManualSave}>Save</button>
                </div>
              </div>

              {/* Other participants' notes */}
              {otherNotes.length > 0 && (
                <div className="call-notes-list">
                  {otherNotes.map((n) => {
                    const authorName = (n.authorId?.name || n.authorName || "Participant").toUpperCase();
                    const isEditing  = editingNoteId === n._id;
                    return (
                      <div key={n._id} className="call-notes-entry">
                        <div className="call-notes-entry-row">
                          <span>COMMENTS BY {authorName}</span>
                          <button
                            className="call-notes-entry-btn"
                            onClick={() => setEditingNoteId(isEditing ? null : n._id)}
                            title="View note"
                          >
                            <FaPen />
                          </button>
                        </div>
                        {isEditing && (
                          <div className="call-notes-entry-preview">
                            <p>{n.content || "(empty)"}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Placeholder list rows (own + mediator) when no notes loaded yet */}
              {notes.length === 0 && (
                <div className="call-notes-list">
                  <div className="call-notes-entry">
                    <div className="call-notes-entry-row">
                      <span>COMMENTS BY {userName.toUpperCase()}</span>
                      <FaPen className="call-notes-entry-icon" />
                    </div>
                  </div>
                  <div className="call-notes-entry">
                    <div className="call-notes-entry-row">
                      <span>COMMENTS FROM MEDIATOR</span>
                      <FaPen className="call-notes-entry-icon" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {panel === "DOCUMENTS" && (
            <div className="call-docs">
              <div className="call-docs-header">
                <span>RECENT DOCUMENTS</span>
                <button
                  className="call-notes-add-btn"
                  onClick={() => navigate("/user/documents")}
                  title="Go to Documents"
                >
                  <FaPlus />
                </button>
              </div>

              {docs.length === 0 ? (
                <p className="call-docs-empty">No documents attached to this case yet.</p>
              ) : (
                <div className="call-docs-list">
                  {docs.map((doc) => (
                    <div key={doc._id} className="call-doc-item">
                      <DocIcon name={doc.fileName || doc.originalFileName || ""} />
                      <div className="call-doc-info">
                        <p className="call-doc-name">
                          {doc.fileName || doc.originalFileName || "Document"}
                        </p>
                        <p className="call-doc-time">Uploaded {timeAgo(doc.createdAt)}</p>
                      </div>
                      <button
                        className="call-doc-link"
                        title="Open"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/documents/${doc._id}/download`);
                            if (res.data?.downloadUrl) window.open(res.data.downloadUrl, "_blank");
                          } catch {}
                        }}
                      >
                        <FaExternalLinkAlt />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingCall;
