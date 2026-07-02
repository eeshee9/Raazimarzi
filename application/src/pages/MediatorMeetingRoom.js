// src/pages/MediatorMeetingRoom.js — Meeting detail / session room
import React, {
  useState, useEffect, useCallback, useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Video, ExternalLink, Send, MessageSquare,
  X, Save, CheckCircle2, AlertCircle, Loader2,
  Clock, Users, ChevronRight, Bold, List, Lock,
  VideoOff,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorMeetingRoom.css";

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
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
};

const fmtTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const fmtDuration = (mins) => {
  if (!mins) return "";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const getInitials = (name) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const CASE_TYPE_LABEL = {
  property:   "Property Dispute",
  rental:     "Rental Dispute",
  consumer:   "Consumer Dispute",
  individual: "Individual Dispute",
  commercial: "Commercial Dispute",
};

const STATUS_PILL = {
  "Scheduled":   { bg: "#EFF6FF", color: "#2563EB" },
  "Confirmed":   { bg: "#ECFDF5", color: "#16A34A" },
  "In Progress": { bg: "#FFF7ED", color: "#D97706" },
  "Completed":   { bg: "#F0FDF4", color: "#15803D" },
  "Rescheduled": { bg: "#F5F3FF", color: "#7C3AED" },
  "No Show":     { bg: "#FEF2F2", color: "#DC2626" },
  "Cancelled":   { bg: "#F9FAFB", color: "#6B7280" },
};

// ─── Extract party info from meeting ─────────────────────────────────────────
const getParties = (meeting) => {
  const c = meeting.caseId;

  const petPart  = meeting.participants?.find(
    (p) => p.role === "petitioner" || p.role === "claimant"
  );
  const respPart = meeting.participants?.find(
    (p) => p.role === "defendant" || p.role === "respondent"
  );

  return {
    party1: {
      name:   petPart?.user?.name  || petPart?.name  || c?.petitionerDetails?.fullName || "Petitioner",
      email:  petPart?.user?.email || c?.petitionerDetails?.email || "",
      avatar: petPart?.user?.avatar || null,
      role:   "Petitioner",
    },
    party2: {
      name:   respPart?.user?.name  || respPart?.name  || c?.respondent?.name || c?.defendantDetails?.fullName || "Respondent",
      email:  respPart?.user?.email || c?.respondent?.email || c?.defendantDetails?.email || "",
      avatar: respPart?.user?.avatar || null,
      role:   "Respondent",
    },
  };
};

// ─── Elapsed timer ────────────────────────────────────────────────────────────
const useElapsedTimer = (startedAt, isLive) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLive || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLive, startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ─── ParticipantTile ──────────────────────────────────────────────────────────
const ParticipantTile = ({ party, badge }) => (
  <div className="mmr-tile">
    <div className="mmr-tile-avatar">
      {party.avatar
        ? <img src={party.avatar} alt={party.name} className="mmr-tile-img" />
        : <div className="mmr-tile-initials">{getInitials(party.name)}</div>
      }
    </div>
    <div className="mmr-tile-info">
      <p className="mmr-tile-name">{party.name}</p>
      <p className="mmr-tile-role">{badge || party.role}</p>
      {party.email && <p className="mmr-tile-email">{party.email}</p>}
    </div>
  </div>
);

// ─── ChatMessage ──────────────────────────────────────────────────────────────
const ChatMessage = ({ msg, myUserId }) => {
  const isMe = msg.sender?._id === myUserId || msg.sender === myUserId;
  const name  = msg.sender?.name || msg.senderName || "Participant";
  const time  = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "";

  return (
    <div className={`mmr-chat-msg${isMe ? " mmr-chat-mine" : ""}`}>
      {!isMe && (
        <div className="mmr-chat-avatar">
          {msg.sender?.avatar
            ? <img src={msg.sender.avatar} alt={name} />
            : <span>{getInitials(name)}</span>
          }
        </div>
      )}
      <div className="mmr-chat-bubble-wrap">
        {!isMe && <p className="mmr-chat-sender">{name}</p>}
        <div className="mmr-chat-bubble">{msg.text}</div>
        <p className="mmr-chat-time">{time}</p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MediatorMeetingRoom = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const myUserId = localStorage.getItem("userId");

  // ── Core data ──
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [meeting,  setMeeting]  = useState(null);
  const [noteId,   setNoteId]   = useState(null);

  // ── Notes ──
  const [noteText,    setNoteText]    = useState("");
  const [noteSaving,  setNoteSaving]  = useState("idle"); // idle|saving|saved|error
  const noteTimer = useRef(null);

  // ── Chat ──
  const [chatOpen,   setChatOpen]   = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [chatInput,  setChatInput]  = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatPollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Load meeting + my note ──
  const loadMeeting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/mediator/meetings/${id}`);
      setMeeting(res.data.meeting);
      if (res.data.myNote) {
        setNoteText(res.data.myNote.content || "");
        setNoteId(res.data.myNote._id);
      }
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "404"
          : (err.response?.data?.message || "Failed to load meeting")
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadMeeting(); }, [loadMeeting]);

  // ── Live elapsed timer ──
  const isLive  = meeting?.status === "In Progress";
  const elapsed = useElapsedTimer(meeting?.startedAt, isLive);

  // ── Autosave notes ──
  const persistNote = useCallback(async (text) => {
    setNoteSaving("saving");
    try {
      const res = await axiosInstance.post(`/meeting-notes/meeting/${id}`, {
        content: text,
        caseId:  meeting?.caseId?._id,
      });
      setNoteId(res.data.note?._id || noteId);
      setNoteSaving("saved");
      setTimeout(() => setNoteSaving("idle"), 2500);
    } catch {
      setNoteSaving("error");
    }
  }, [id, meeting?.caseId?._id, noteId]);

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNoteText(val);
    setNoteSaving("idle");
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => persistNote(val), 1500);
  };

  // ── Load chat messages ──
  const loadMessages = useCallback(async () => {
    if (chatLoading) return;
    setChatLoading(true);
    try {
      const res = await axiosInstance.get(`/meeting-messages/meeting/${id}`);
      setMessages(res.data.messages || []);
    } catch {
      // silently fail on poll errors
    } finally {
      setChatLoading(false);
    }
  }, [id, chatLoading]);

  // Start/stop polling when chat panel opens
  useEffect(() => {
    if (chatOpen) {
      loadMessages();
      chatPollRef.current = setInterval(loadMessages, 5000);
    } else {
      clearInterval(chatPollRef.current);
    }
    return () => clearInterval(chatPollRef.current);
  }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──
  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    try {
      const res = await axiosInstance.post(`/meeting-messages/meeting/${id}`, { text });
      setMessages((prev) => [...prev, res.data.message]);
      setChatInput("");
    } catch {
      // keep input so user can retry
    } finally {
      setChatSending(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Join external video ──
  const handleJoinVideo = () => {
    const link = meeting?.virtualMeeting?.meetingLink;
    if (link) window.open(link, "_blank", "noopener");
    else alert("No video meeting link has been set for this session. Please contact the admin.");
  };

  // ── Render states ──
  if (loading) {
    return (
      <MediatorLayout>
        <div className="mmr-fullstate">
          <Loader2 size={28} className="mmr-spin" />
          <p>Loading meeting…</p>
        </div>
      </MediatorLayout>
    );
  }

  if (error) {
    return (
      <MediatorLayout>
        <div className="mmr-fullstate">
          <AlertCircle size={36} color="#DC2626" />
          <p>{error === "404" ? "Meeting not found or not assigned to you." : error}</p>
          <button className="mmr-back-btn" onClick={() => navigate("/mediator/meetings")}>
            <ArrowLeft size={15} /> Back to Meetings
          </button>
        </div>
      </MediatorLayout>
    );
  }

  const c           = meeting.caseId;
  const { party1, party2 } = getParties(meeting);
  const spill       = STATUS_PILL[meeting.status] || STATUS_PILL["Scheduled"];
  const hasVideoLink = !!meeting.virtualMeeting?.meetingLink;
  const catLabel    = c?.caseType ? (CASE_TYPE_LABEL[c.caseType] || c.caseType) : null;
  const isDone      = ["Completed", "No Show", "Cancelled"].includes(meeting.status);

  return (
    <MediatorLayout>
      <div className="mmr-page">

        {/* ── Breadcrumb ── */}
        <nav className="mmr-breadcrumb">
          <button className="mmr-bc-back" onClick={() => navigate("/mediator/meetings")}>
            <ArrowLeft size={15} />
          </button>
          <span
            className="mmr-bc-link"
            role="button" tabIndex={0}
            onClick={() => navigate("/mediator/meetings")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/mediator/meetings")}
          >
            Meetings
          </span>
          {c?.caseId && (
            <>
              <ChevronRight size={12} className="mmr-bc-sep" />
              <span
                className="mmr-bc-link"
                role="button" tabIndex={0}
                onClick={() => navigate(`/mediator/cases/${c._id || c}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/mediator/cases/${c._id || c}`)}
              >
                {c.caseId}
              </span>
            </>
          )}
          <ChevronRight size={12} className="mmr-bc-sep" />
          <span className="mmr-bc-cur">{meeting.meetingTitle}</span>
        </nav>

        {/* ── Header ── */}
        <div className="mmr-header">
          <div className="mmr-header-left">
            <div className="mmr-title-row">
              <h1 className="mmr-title">{meeting.meetingTitle}</h1>
              {c?.caseId && <span className="mmr-case-ref">#{c.caseId}</span>}
              <span
                className="mmr-status-pill"
                style={{ background: spill.bg, color: spill.color }}
              >
                {isLive && <span className="mmr-live-dot" />}
                {meeting.status}
              </span>
              {meeting.recording?.isRecorded && (
                <span className="mmr-rec-badge">
                  <span className="mmr-rec-dot" />RECORDING
                </span>
              )}
            </div>
            <div className="mmr-meta-row">
              {c?.caseTitle && <span className="mmr-meta-case">{c.caseTitle}</span>}
              {catLabel && <span className="mmr-meta-sep">·</span>}
              {catLabel && <span className="mmr-meta-type">{catLabel}</span>}
            </div>
          </div>

          <div className="mmr-header-right">
            {isLive && (
              <div className="mmr-timer">
                <Clock size={14} />
                <span>{elapsed}</span>
              </div>
            )}
            {!isLive && meeting.scheduledDate && (
              <div className="mmr-sched-chip">
                <Clock size={13} />
                {fmtDate(meeting.scheduledDate)}
                {meeting.startTime && ` · ${fmt12h(meeting.startTime)}`}
              </div>
            )}
            <button className="mmr-chat-toggle-btn" onClick={() => setChatOpen((v) => !v)}>
              <MessageSquare size={16} />
              <span>Meeting Chat</span>
              {messages.length > 0 && !chatOpen && (
                <span className="mmr-chat-badge">{messages.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Main body ── */}
        <div className={`mmr-body${chatOpen ? " mmr-body-chat" : ""}`}>

          {/* Left / main column */}
          <div className="mmr-main">

            {/* Session info bar */}
            <div className={`mmr-session-bar${isLive ? " mmr-session-live" : ""}`}>
              {isLive ? (
                <>
                  <span className="mmr-live-label">
                    <span className="mmr-live-dot-lg" />
                    LIVE
                  </span>
                  <span className="mmr-session-text">Session in progress — {meeting.meetingType}</span>
                  <span className="mmr-session-elapsed">{elapsed}</span>
                  <span className="mmr-session-pcount">
                    <Users size={13} />
                    {(meeting.participants?.length || 0) + 1} participants
                  </span>
                </>
              ) : (
                <>
                  <span className="mmr-session-text">
                    {isDone ? "Session ended" : `Scheduled — ${meeting.meetingType}`}
                    {meeting.duration && !isDone ? ` · ${fmtDuration(meeting.duration)}` : ""}
                  </span>
                  {isDone && meeting.completedAt && (
                    <span className="mmr-session-elapsed">Completed {fmtTime(meeting.completedAt)}</span>
                  )}
                  {!isDone && (
                    <span className="mmr-session-pcount">
                      <Clock size={13} />
                      {fmt12h(meeting.startTime)}
                      {meeting.endTime ? ` – ${fmt12h(meeting.endTime)}` : ""}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Participants */}
            <div className="mmr-parties-row">
              <ParticipantTile party={party1} badge="Party 1 (Petitioner)" />
              <div className="mmr-vs-sep">VS</div>
              <ParticipantTile party={party2} badge="Party 2 (Respondent)" />
            </div>

            {/* Video join button */}
            <div className="mmr-join-area">
              {hasVideoLink ? (
                <button className="mmr-join-btn" onClick={handleJoinVideo}>
                  <Video size={16} />
                  Join Video Session
                  <ExternalLink size={13} />
                </button>
              ) : (
                <div className="mmr-no-link">
                  <VideoOff size={18} />
                  <span>No video link set — contact admin to add a meeting link.</span>
                </div>
              )}

              {meeting.virtualMeeting?.platform && (
                <span className="mmr-platform-badge">
                  via {meeting.virtualMeeting.platform}
                </span>
              )}
            </div>

            {/* Agenda items (if present) */}
            {meeting.agendaItems?.length > 0 && (
              <div className="mmr-card mmr-agenda">
                <h4 className="mmr-card-h">Agenda</h4>
                <ol className="mmr-agenda-list">
                  {meeting.agendaItems
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((ai, i) => (
                      <li key={i}>{ai.item}</li>
                    ))}
                </ol>
              </div>
            )}

            {/* SESSION NOTES (LIVE) */}
            <div className="mmr-notes-panel">
              <div className="mmr-notes-header">
                <span className="mmr-notes-label">SESSION NOTES (LIVE)</span>
                <span className={`mmr-notes-status mmr-ns-${noteSaving}`}>
                  {noteSaving === "saving" && <><Loader2 size={12} className="mmr-spin" /> Autosaving…</>}
                  {noteSaving === "saved"  && <><CheckCircle2 size={12} /> Saved</>}
                  {noteSaving === "error"  && <><AlertCircle size={12} /> Save failed</>}
                  {noteSaving === "idle"   && "Autosaving…"}
                </span>
                <div className="mmr-notes-toolbar">
                  <button className="mmr-ntb-btn" title="Bold (formatting hint)"><Bold size={13} /></button>
                  <button className="mmr-ntb-btn" title="List (formatting hint)"><List size={13} /></button>
                  <button className="mmr-ntb-btn mmr-ntb-lock" title="Private — visible only to you">
                    <Lock size={13} />
                  </button>
                </div>
                <button
                  className="mmr-notes-save-btn"
                  onClick={() => { clearTimeout(noteTimer.current); persistNote(noteText); }}
                  disabled={noteSaving === "saving"}
                  title="Save now"
                >
                  <Save size={13} />
                </button>
              </div>
              <textarea
                className="mmr-notes-ta"
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Start typing mediator notes here… The claimant and respondent cannot see these notes."
                rows={6}
              />
              <div className="mmr-notes-footer">
                <span className="mmr-live-transcript">
                  <span className="mmr-lt-dot" />
                  Private — not visible to parties
                </span>
              </div>
            </div>
          </div>

          {/* ── Chat panel ── */}
          {chatOpen && (
            <div className="mmr-chat-panel">
              <div className="mmr-chat-hdr">
                <MessageSquare size={15} />
                <span>Meeting Chat</span>
                <button className="mmr-chat-close" onClick={() => setChatOpen(false)}>
                  <X size={15} />
                </button>
              </div>

              <div className="mmr-chat-body">
                {chatLoading && messages.length === 0 ? (
                  <div className="mmr-chat-loading">
                    <Loader2 size={18} className="mmr-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="mmr-chat-empty">
                    <MessageSquare size={22} />
                    <p>No messages yet.<br/>Start the conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessage key={msg._id} msg={msg} myUserId={myUserId} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="mmr-chat-input-row">
                <input
                  type="text"
                  className="mmr-chat-input"
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  maxLength={1000}
                />
                <button
                  className="mmr-chat-send"
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || chatSending}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorMeetingRoom;
