// src/pages/AdminMeetingCall.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import {
  FaMicrophone,
  FaVideo,
  FaUsers, FaPhoneSlash,
  FaCommentDots, FaStickyNote, FaFolderOpen,
  FaTimes, FaPlus, FaPen, FaExternalLinkAlt,
  FaFilePdf, FaFileImage, FaFile,
  FaBell, FaSearch,
} from "react-icons/fa";
import { MdScreenShare } from "react-icons/md";
import "./AdminMeetingCall.css";

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmtElapsed = (s) => {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
};

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const avatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "P")}&background=778aff&color=fff&size=200`;

const msgInitials = (name) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
};

const DocIcon = ({ name = "" }) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FaFilePdf  className="amc-doc-type-icon amc-doc-type-icon--pdf" />;
  if (["jpg","jpeg","png","gif","webp"].includes(ext))
    return <FaFileImage className="amc-doc-type-icon amc-doc-type-icon--img" />;
  return <FaFile className="amc-doc-type-icon" />;
};

const TABS = [
  { id: "MEETING CHAT", label: "MEETING CHAT", Icon: FaCommentDots },
  { id: "NOTES",        label: "NOTES",        Icon: FaStickyNote  },
  { id: "DOCUMENTS",    label: "DOCUMENTS",    Icon: FaFolderOpen  },
  { id: "PARTICIPANTS", label: "PARTICIPANTS", Icon: FaUsers        },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const AdminMeetingCall = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  /* Meeting */
  const [meeting,  setMeeting]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  /* Controls — muted/camOff seeded from lobby preferences if available */
  const [muted,     setMuted]     = useState(location.state?.initialMuted  ?? false);
  const [camOff,    setCamOff]    = useState(location.state?.initialCamOff ?? false);
  const [recording, setRecording] = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [ending,    setEnding]    = useState(false);

  /* Panel */
  const [panel, setPanel] = useState(null); // null | "MEETING CHAT" | "NOTES" | "DOCUMENTS"

  /* Chat */
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatLoading,  setChatLoading]  = useState(true);
  const chatEndRef = useRef();
  const socketRef  = useRef(null);

  /* Notes */
  const [notes,         setNotes]         = useState([]);
  const [noteContent,   setNoteContent]   = useState("");
  const [activeNoteId,  setActiveNoteId]  = useState(null);
  const [noteSaveText,  setNoteSaveText]  = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const noteSaveTimer = useRef();

  /* Documents */
  const [docs, setDocs] = useState([]);

  /* Admin info */
  const userId      = localStorage.getItem("userId") || "";
  const userName    = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") || avatarUrl(userName);

  /* Timer */
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* Load meeting; initialize recording badge from real meeting data */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    api.get(`/meetings/${id}`)
      .then((res) => {
        const m = res.data.meeting;
        setMeeting(m);
        setRecording(Boolean(m.recording?.isRecorded));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, navigate]);

  /* Load chat history */
  useEffect(() => {
    setChatLoading(true);
    api.get(`/meeting-messages/meeting/${id}`)
      .then((res) => setChatMessages(res.data.messages || []))
      .catch(() => {})
      .finally(() => setChatLoading(false));
  }, [id]);

  /* Load notes */
  useEffect(() => {
    api.get(`/meeting-notes/meeting/${id}`)
      .then((res) => {
        const loaded = res.data.notes || [];
        setNotes(loaded);
        const mine = loaded.find(
          (n) => (n.authorId?._id || n.authorId)?.toString() === userId
        );
        if (mine) { setActiveNoteId(mine._id); setNoteContent(mine.content || ""); }
      })
      .catch(() => {});
  }, [id, userId]);

  /* Load documents from linked case */
  useEffect(() => {
    if (!meeting) return;
    const caseId = meeting.caseId?._id || meeting.caseId;
    if (!caseId) return;
    api.get(`/documents/case/${caseId}`)
      .then((res) => setDocs(res.data.documents || []))
      .catch(() => {});
  }, [meeting]);

  /* Socket.IO real-time chat */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const baseUrl = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";
    const s = io(baseUrl, { auth: { token }, transports: ["websocket", "polling"] });
    s.emit("joinRoom", `meeting:${id}`);
    s.on("receiveMessage", (msg) => {
      if (msg.senderId !== userId && msg.senderName !== userName) {
        setChatMessages((prev) => [...prev, { ...msg, _remote: true }]);
      }
    });
    socketRef.current = s;
    return () => { s.close(); socketRef.current = null; };
  }, [id, userId, userName]);

  /* Auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* Send chat message */
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    const now = new Date();
    setChatMessages((prev) => [
      ...prev,
      { _localId: Date.now(), senderName: userName, text, createdAt: now.toISOString(), _self: true },
    ]);
    socketRef.current?.emit("sendMessage", {
      roomId:  `meeting:${id}`,
      message: { senderName: userName, senderId: userId, text, createdAt: now.toISOString() },
    });
    api.post(`/meeting-messages/meeting/${id}`, { text }).catch(() => {});
  };

  /* Notes autosave */
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
      setNoteSaveText(
        `Auto saved ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
      );
    } catch { setNoteSaveText("Save failed"); }
  }, [id, meeting]);

  const handleManualSave = () => {
    clearTimeout(noteSaveTimer.current);
    persistNote(noteContent);
  };

  /* End session */
  const handleEndSession = async () => {
    if (!window.confirm("End this session for all participants?")) return;
    setEnding(true);
    try {
      await api.patch(`/meetings/${id}/complete`, {
        summary:          noteContent || "Session completed by admin",
        agreementReached: false,
        meetingNotes:     noteContent,
      });
    } catch (_) {}
    navigate("/admin/case-meetings");
  };

  /* Loading */
  if (loading) return (
    <div className="amc-loading">
      <div className="amc-spinner" />
      <p>Loading session…</p>
    </div>
  );

  /* Derived values */
  const caseTitle = meeting?.caseId?.caseTitle || meeting?.meetingTitle || "Case Session";
  const sessionNum = meeting?._id?.slice(-4) || "0000";
  const mediator  = meeting?.mediator;
  const parts     = meeting?.participants || [];
  const mainTile       = mediator || { name: "Mediator" };
  const sideTiles      = parts.slice(0, 2);
  const allParticipants = [
    ...(mediator ? [{ name: mediator.name || "Mediator", role: "Mediator" }] : []),
    ...parts.map((p) => ({ name: p.name || p.user?.name || "Participant", role: p.role || "Participant" })),
  ];

  const otherNotes = notes.filter(
    (n) => (n.authorId?._id || n.authorId)?.toString() !== userId
  );

  return (
    <div className="amc-root">
      <AdminSidebar />

      {/* ── Main call area ── */}
      <div className="amc-main">

        {/* Admin topbar */}
        <header className="amc-topbar">
          <div className="amc-search">
            <FaSearch className="amc-search-icon" />
            <input className="amc-search-input" placeholder="Search cases, mediators or meetings…" readOnly />
          </div>
          <div className="amc-topbar-right">
            <button className="amc-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="amc-admin-avatar" />
          </div>
        </header>

        {/* Meeting header: title + recording + timer */}
        <div className="amc-call-header">
          <div className="amc-call-title-row">
            <h2 className="amc-call-title">
              {caseTitle}
              <span className="amc-call-sep"> | </span>
              <span className="amc-call-num">#{sessionNum}</span>
            </h2>
            {recording && (
              <span className="amc-rec-badge">
                <span className="amc-rec-dot" /> RECORDING
              </span>
            )}
          </div>
          <div className="amc-timer">
            <span className="amc-timer-dot" />
            {fmtElapsed(elapsed)}
          </div>
        </div>

        {/* Video grid */}
        <div className="amc-videos">

          {/* Main tile — mediator */}
          <div className="amc-tile-main">
            <img
              src={mainTile.avatar || avatarUrl(mainTile.name || "Mediator")}
              alt={mainTile.name || "Mediator"}
              className="amc-tile-img"
            />
            <span className="amc-tile-badge">MEDIATOR</span>
            <div className="amc-tile-label">
              <span className="amc-tile-mic">{muted ? "🔇" : "🎙"}</span>
              {mainTile.name || "Mediator"} (Mediator)
            </div>
          </div>

          {/* Side tiles — participants */}
          <div className="amc-tile-col">
            {sideTiles.length > 0 ? (
              sideTiles.map((p, i) => {
                const pName = p.name || p.user?.name || "Participant";
                const pRole = p.role || "Participant";
                return (
                  <div key={i} className="amc-tile-side">
                    <img
                      src={p.user?.avatar || avatarUrl(pName)}
                      alt={pName}
                      className="amc-tile-img"
                    />
                    <div className="amc-tile-label">
                      <span className="amc-tile-mic">🎙</span>
                      {pName} ({pRole})
                    </div>
                  </div>
                );
              })
            ) : (
              ["Petitioner", "Respondent"].map((role, i) => (
                <div key={i} className="amc-tile-side amc-tile-empty">
                  <span className="amc-tile-ph-icon">👤</span>
                  <span className="amc-tile-ph-label">{role}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls bar */}
        <div className="amc-controls">
          <button
            className="amc-ctrl"
            disabled
            title="Microphone control unavailable — live audio not yet implemented"
          >
            <FaMicrophone />
            <span>MUTE</span>
          </button>

          <button
            className="amc-ctrl"
            disabled
            title="Camera control unavailable — live video not yet implemented"
          >
            <FaVideo />
            <span>CAMERA</span>
          </button>

          <button className="amc-ctrl" disabled title="Screen sharing not yet implemented">
            <MdScreenShare />
            <span>SHARE</span>
          </button>

          <button
            className={`amc-ctrl${recording ? " amc-ctrl--record" : ""}`}
            disabled
            title="Recording is managed by meeting configuration"
          >
            <span className="amc-rec-dot-ctrl" />
            <span>RECORD</span>
          </button>

          <button
            className={`amc-ctrl${panel === "PARTICIPANTS" ? " amc-ctrl--active" : ""}`}
            onClick={() => setPanel((v) => v === "PARTICIPANTS" ? null : "PARTICIPANTS")}
            title="View participants"
          >
            <FaUsers />
            <span>PARTICIPANTS</span>
          </button>

          <button
            className="amc-ctrl amc-ctrl--end"
            onClick={handleEndSession}
            disabled={ending}
            title="End session"
          >
            <FaPhoneSlash />
            <span>END</span>
          </button>
        </div>
      </div>

      {/* ── Right: icon strip (panel closed) ── */}
      {!panel && (
        <div className="amc-panel-opener">
          {TABS.map(({ id: tabId, label, Icon }) => (
            <button
              key={tabId}
              className="amc-opener-btn"
              onClick={() => setPanel(tabId)}
              title={label}
            >
              <Icon />
              <span>{label.replace(" ", "\n")}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Right: full panel (open) ── */}
      {panel && (
        <div className="amc-right-panel">

          {/* Close row */}
          <div className="amc-panel-close-row">
            <button className="amc-panel-close" onClick={() => setPanel(null)} title="Close">
              <FaTimes />
            </button>
          </div>

          {/* Panel icon + title */}
          {(() => {
            const tab = TABS.find((t) => t.id === panel);
            return tab ? (
              <div className="amc-panel-heading">
                <tab.Icon className="amc-panel-heading-icon" />
                <span className="amc-panel-heading-label">{tab.label}</span>
              </div>
            ) : null;
          })()}

          {/* ── MEETING CHAT ── */}
          {panel === "MEETING CHAT" && (
            <div className="amc-chat">
              <div className="amc-chat-messages">
                {chatLoading && <p className="amc-chat-empty">Loading messages…</p>}
                {!chatLoading && chatMessages.length === 0 && (
                  <p className="amc-chat-empty">No messages yet.</p>
                )}
                {chatMessages.map((msg, i) => {
                  const isSelf =
                    msg._self ||
                    (msg.sender?._id || msg.sender)?.toString() === userId ||
                    msg.senderName === userName;
                  const inits = msgInitials(msg.senderName || msg.sender?.name || "?");
                  return (
                    <div
                      key={msg._id || msg._localId || i}
                      className={`amc-chat-msg${isSelf ? " amc-chat-self" : " amc-chat-other"}`}
                    >
                      {!isSelf && <div className="amc-chat-av">{inits}</div>}
                      <div className="amc-chat-bubble">
                        <p>{msg.text}</p>
                        <span className="amc-chat-time">
                          {fmtTime(msg.createdAt || msg.sentAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="amc-chat-input-row">
                <input
                  placeholder="Type a message..."
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
            <div className="amc-notes">
              <div className="amc-notes-inner">
                <div className="amc-notes-head">
                  <span>YOUR NOTES</span>
                  <button
                    className="amc-notes-add"
                    onClick={() => { setNoteContent(""); setActiveNoteId(null); }}
                    title="New note"
                  >
                    <FaPlus />
                  </button>
                </div>

                <div className="amc-notes-card">
                  <p className="amc-notes-card-label">COMMENTS BY {userName.toUpperCase()}</p>
                  <textarea
                    className="amc-notes-ta"
                    placeholder="Start typing your notes…"
                    value={noteContent}
                    onChange={(e) => handleNoteChange(e.target.value)}
                  />
                  <div className="amc-notes-footer">
                    <span className="amc-notes-save-txt">{noteSaveText || "Auto saves as you type"}</span>
                    <button className="amc-notes-save-btn" onClick={handleManualSave}>Save</button>
                  </div>
                </div>

                {otherNotes.map((n) => {
                  const authorName = (n.authorId?.name || n.authorName || "Participant").toUpperCase();
                  const isEditing  = editingNoteId === n._id;
                  return (
                    <div key={n._id} className="amc-notes-entry">
                      <div className="amc-notes-entry-row">
                        <span>COMMENTS BY {authorName}</span>
                        <button
                          className="amc-notes-entry-btn"
                          onClick={() => setEditingNoteId(isEditing ? null : n._id)}
                        >
                          <FaPen />
                        </button>
                      </div>
                      {isEditing && (
                        <div className="amc-notes-entry-preview">
                          <p>{n.content || "(empty)"}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {panel === "DOCUMENTS" && (
            <div className="amc-docs">
              <div className="amc-docs-inner">
                <p className="amc-docs-head">RECENT DOCUMENTS</p>
                {docs.length === 0 ? (
                  <p className="amc-docs-empty">No documents attached to this case yet.</p>
                ) : (
                  docs.map((doc) => (
                    <div key={doc._id} className="amc-doc-item">
                      <DocIcon name={doc.fileName || doc.originalFileName || ""} />
                      <div className="amc-doc-info">
                        <p className="amc-doc-name">
                          {doc.fileName || doc.originalFileName || "Document"}
                        </p>
                        <p className="amc-doc-time">Uploaded {timeAgo(doc.createdAt)}</p>
                      </div>
                      <button
                        className="amc-doc-link"
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
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── PARTICIPANTS ── */}
          {panel === "PARTICIPANTS" && (
            <div className="amc-plist">
              <div className="amc-plist-inner">
                <p className="amc-plist-head">IN THIS SESSION</p>
                {allParticipants.length === 0 ? (
                  <p className="amc-plist-empty">No participants listed.</p>
                ) : allParticipants.map((p, i) => (
                  <div key={i} className="amc-plist-row">
                    <div className="amc-plist-av">{msgInitials(p.name)}</div>
                    <div>
                      <p className="amc-plist-name">{p.name}</p>
                      <p className="amc-plist-role">{(p.role || "Participant").toUpperCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMeetingCall;
