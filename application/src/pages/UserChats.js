import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import api from "../api/axios";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import "./UserChats.css";
import {
  FaPaperPlane, FaPaperclip, FaSearch, FaTimes, FaFileAlt,
  FaImage, FaCheck, FaCheckDouble, FaCommentDots,
  FaTrash, FaPen, FaReply, FaPlus, FaEye,
} from "react-icons/fa";

/* ─── helpers ────────────────────────────────────────────────── */
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (d) => {
  const now = new Date();
  const day = new Date(d);
  if (now.toDateString() === day.toDateString()) return "Today";
  const yd = new Date(now);
  yd.setDate(yd.getDate() - 1);
  if (yd.toDateString() === day.toDateString()) return "Yesterday";
  return day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const groupByDate = (msgs) => {
  const groups = [];
  let lastDate = null;
  msgs.forEach((m) => {
    const d = fmtDate(m.createdAt);
    if (d !== lastDate) {
      groups.push({ type: "date", label: d });
      lastDate = d;
    }
    groups.push(m);
  });
  return groups;
};

const statusMeta = (status) => {
  const s = (status || "").toLowerCase();
  if (["resolved", "awarded"].includes(s))
    return { label: "Resolved", bg: "#dcfce7", color: "#15803d" };
  if (["rejected"].includes(s))
    return { label: "Rejected", bg: "#fee2e2", color: "#dc2626" };
  if (["closed", "withdrawn"].includes(s))
    return { label: "Closed", bg: "#f3f4f6", color: "#6b7280" };
  if (["mediation", "in-progress", "assigned", "notice-sent", "arbitration"].includes(s))
    return { label: "Mediation", bg: "#dbeafe", color: "#1d4ed8" };
  return { label: "Pending", bg: "#fef9c3", color: "#92400e" };
};

/* ─── component ──────────────────────────────────────────────── */
const UserChats = () => {
  /* chat state */
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);

  /* right panel state */
  const [rightTab, setRightTab] = useState("info");
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseDocs, setCaseDocs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const typingRef = useRef(null);
  const inputRef = useRef(null);
  /* live refs so socket closures never capture stale values */
  const selectedRef = useRef(null);
  const fetchConvsRef = useRef(null);

  const userId = localStorage.getItem("userId");

  /* sync refs on every render */
  selectedRef.current = selected;

  /* ── socket ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    const baseUrl = apiUrl.replace(/\/api\/?$/, "");
    const s = io(baseUrl, { auth: { token }, transports: ["websocket", "polling"] });

    s.on("new-message", ({ message: m }) => {
      const activeConv = selectedRef.current;
      const convId = m.conversationId?.toString?.() ?? m.conversationId;
      const isActiveConv = activeConv && activeConv._id === convId;

      if (isActiveConv) {
        /* message belongs to the open chat — append and mark read */
        setMessages((p) => [...p, m]);
        scrollBottom();
        api.patch(`/chats/conversations/${convId}/read`).catch(() => {});
      }
      /* always refresh sidebar so unread badge + last-message preview stay current */
      fetchConvsRef.current?.();
    });
    s.on("user-typing", ({ isTyping: t }) => setOtherTyping(t));
    s.on("typing", ({ isTyping: t }) => setOtherTyping(t));
    s.on("messages-read", () => {
      setMessages((p) =>
        p.map((m) => (m.sender._id === userId ? { ...m, status: "read" } : m))
      );
    });
    s.on("message-deleted", ({ messageId }) => {
      setMessages((p) =>
        p.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
        )
      );
    });
    s.on("message-edited", ({ messageId, content, editedAt }) => {
      setMessages((p) =>
        p.map((m) => (m._id === messageId ? { ...m, content, isEdited: true, editedAt } : m))
      );
    });

    setSocket(s);
    return () => s.close();
  }, []); // eslint-disable-line

  /* ── fetch conversations (called on init and after any message event) ── */
  const fetchConversations = useCallback(async () => {
    try {
      const r = await api.get("/chats/conversations");
      setConversations(r.data.conversations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  /* keep fetchConvsRef current so socket handler always calls the latest version */
  fetchConvsRef.current = fetchConversations;

  /* ── initial load ── */
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* ── fetch messages ── */
  const fetchMessages = useCallback(
    async (convId) => {
      try {
        const r = await api.get(`/chats/conversations/${convId}/messages`);
        setMessages(r.data.messages || []);
        if (socket) socket.emit("join-conversation", convId);
        await api.patch(`/chats/conversations/${convId}/read`);
        scrollBottom();
      } catch (e) {
        console.error(e);
      }
    },
    [socket]
  );

  /* ── fetch right panel data (case + docs + notes) ── */
  const fetchRightPanel = useCallback(async (conv) => {
    const caseId = conv.relatedCase?._id;
    try {
      if (caseId) {
        const [caseRes, docsRes, notesRes] = await Promise.all([
          api.get(`/cases/${caseId}`).catch(() => null),
          api.get(`/documents/case/${caseId}`).catch(() => null),
          api.get(`/chat-notes/${conv._id}`).catch(() => null),
        ]);
        const d = caseRes?.data;
        setCaseDetail(d?.case || d || null);
        setCaseDocs((docsRes?.data?.documents || []).slice(0, 3));
        setNotes(notesRes?.data?.notes || []);
      } else {
        setCaseDetail(null);
        setCaseDocs([]);
        const notesRes = await api.get(`/chat-notes/${conv._id}`).catch(() => null);
        setNotes(notesRes?.data?.notes || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── select conversation ── */
  const handleSelect = async (conv) => {
    setSelected(conv);
    setReplyTo(null);
    setEditingMsg(null);
    setShowNoteEditor(false);
    setNoteInput("");
    setEditingNote(null);
    setCaseDetail(null);
    setCaseDocs([]);
    setNotes([]);
    await Promise.all([fetchMessages(conv._id), fetchRightPanel(conv)]);
  };

  /* ── send / edit message ── */
  const handleSend = async () => {
    if (!input.trim() && !file) return;
    if (sending) return;

    if (editingMsg) {
      try {
        await api.patch(`/chats/messages/${editingMsg._id}`, { content: input.trim() });
        setMessages((p) =>
          p.map((m) =>
            m._id === editingMsg._id ? { ...m, content: input.trim(), isEdited: true } : m
          )
        );
        setEditingMsg(null);
        setInput("");
      } catch {
        alert("Failed to edit message.");
      }
      return;
    }

    setSending(true);
    try {
      const receiverId = selected.participants.find(
        (p) => p._id?.toString() !== userId?.toString()
      )?._id;

      if (file) {
        const fd = new FormData();
        fd.append("receiverId", receiverId);
        fd.append("content", input.trim() || "File attachment");
        fd.append("file", file);
        fd.append("messageType", file.type.startsWith("image/") ? "image" : "file");
        if (replyTo) fd.append("replyToId", replyTo._id);
        const r = await api.post("/chats/messages", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessages((p) => [...p, r.data.message]);
        setFile(null);
      } else {
        const r = await api.post("/chats/messages", {
          receiverId,
          content: input.trim(),
          replyToId: replyTo?._id,
        });
        setMessages((p) => [...p, r.data.message]);
      }

      setInput("");
      setReplyTo(null);
      handleStopTyping();
      scrollBottom();
      fetchConversations();
    } catch {
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  /* ── delete message ── */
  const handleDelete = async (msg, forAll) => {
    try {
      await api.delete(`/chats/messages/${msg._id}`, {
        data: { deleteFor: forAll ? "everyone" : "me" },
      });
      if (forAll) {
        setMessages((p) =>
          p.map((m) =>
            m._id === msg._id
              ? { ...m, isDeleted: true, content: "This message was deleted" }
              : m
          )
        );
      } else {
        setMessages((p) => p.filter((m) => m._id !== msg._id));
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete.");
    }
  };

  /* ── typing ── */
  const handleTyping = () => {
    if (!socket || !selected) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { conversationId: selected._id, isTyping: true });
    }
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    if (socket && selected && isTyping) {
      socket.emit("typing", { conversationId: selected._id, isTyping: false });
      setIsTyping(false);
    }
  };

  /* ── file ── */
  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB");
      return;
    }
    setFile(f);
  };

  /* ── notes CRUD ── */
  const handleSaveNote = async () => {
    if (!selected || !noteInput.trim()) return;
    setNoteSaving(true);
    try {
      if (editingNote) {
        const r = await api.patch(`/chat-notes/${editingNote._id}`, {
          content: noteInput.trim(),
        });
        setNotes((p) =>
          p.map((n) => (n._id === editingNote._id ? r.data.note : n))
        );
        setEditingNote(null);
      } else {
        const r = await api.post("/chat-notes", {
          conversationId: selected._id,
          content: noteInput.trim(),
        });
        setNotes((p) => [r.data.note, ...p]);
      }
      setShowNoteEditor(false);
      setNoteInput("");
    } catch {
      alert("Failed to save note.");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteInput(note.content);
    setShowNoteEditor(true);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/chat-notes/${noteId}`);
      setNotes((p) => p.filter((n) => n._id !== noteId));
    } catch {
      alert("Failed to delete note.");
    }
  };

  const handleOpenNoteEditor = () => {
    setEditingNote(null);
    setNoteInput("");
    setShowNoteEditor(true);
  };

  const handleCancelNote = () => {
    setShowNoteEditor(false);
    setNoteInput("");
    setEditingNote(null);
  };

  const scrollBottom = () =>
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  /* ── filtered conversations ── */
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const caseId = (c.relatedCase?.caseId || "").toLowerCase();
    const caseTitle = (c.relatedCase?.caseTitle || "").toLowerCase();
    const other = c.participants.find((p) => p._id !== userId);
    const otherName = (other?.name || "").toLowerCase();
    return caseId.includes(q) || caseTitle.includes(q) || otherName.includes(q);
  });

  /* ── derived ── */
  const grouped = groupByDate(messages);
  const otherParticipant = selected?.participants.find((p) => p._id !== userId);
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  /* ══════════════════ loading screen ══════════════════ */
  if (loading) {
    return (
      <div className="uc-dashboard">
        <UserSidebar activePage="chats" />
        <section className="uc-main">
          <UserNavbar />
          <div className="uc-loading">
            <span className="uc-dot" />
            <span className="uc-dot" />
            <span className="uc-dot" />
          </div>
        </section>
      </div>
    );
  }

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className="uc-dashboard">
      <UserSidebar activePage="chats" />

      <section className="uc-main">
        <UserNavbar />

        <div className="uc-wrap">

          {/* ══ LEFT PANEL ══ */}
          <div className="uc-left">
            <div className="uc-left-head">
              <h3 className="uc-left-title">Messages</h3>
            </div>

            <div className="uc-search-wrap">
              <div className="uc-search-box">
                <FaSearch className="uc-search-icon" />
                <input
                  className="uc-search-input"
                  placeholder="Search by case or title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <FaTimes className="uc-search-clear" onClick={() => setSearch("")} />
                )}
              </div>
            </div>

            <div className="uc-conv-list">
              {filtered.length === 0 ? (
                <div className="uc-empty-conv">
                  <FaCommentDots />
                  <p>No conversations found</p>
                </div>
              ) : (
                filtered.map((conv) => {
                  const active = selected?._id === conv._id;
                  const rc = conv.relatedCase;
                  const other = conv.participants.find((p) => p._id !== userId);
                  const sm = rc ? statusMeta(rc.status) : null;

                  return (
                    <div
                      key={conv._id}
                      className={`uc-conv-item${active ? " uc-conv-item--active" : ""}`}
                      onClick={() => handleSelect(conv)}
                    >
                      {rc ? (
                        <>
                          <div className="uc-conv-header-row">
                            <span className="uc-conv-case-id">#{rc.caseId}</span>
                            <span
                              className="uc-conv-chip"
                              style={{ background: sm.bg, color: sm.color }}
                            >
                              {sm.label}
                            </span>
                          </div>
                          <p className="uc-conv-case-title">{rc.caseTitle || "Case"}</p>
                        </>
                      ) : (
                        <div className="uc-conv-header-row">
                          <span className="uc-conv-name">{other?.name || "Support"}</span>
                          {conv.unreadCount > 0 && (
                            <span className="uc-conv-badge">{conv.unreadCount}</span>
                          )}
                        </div>
                      )}
                      <p className="uc-conv-preview">
                        {conv.lastMessage?.text || "No messages yet"}
                      </p>
                      <div className="uc-conv-meta">
                        <span className="uc-conv-time">
                          {conv.lastMessage?.sentAt && fmtTime(conv.lastMessage.sentAt)}
                        </span>
                        {conv.unreadCount > 0 && rc && (
                          <span className="uc-conv-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ══ CENTER CHAT ══ */}
          {selected ? (
            <div className="uc-center">
              {/* header */}
              <div className="uc-chat-header">
                <div className="uc-chat-header-left">
                  {selected.relatedCase ? (
                    <>
                      <p className="uc-chat-case-id">#{selected.relatedCase.caseId}</p>
                      <p className="uc-chat-case-title">
                        {selected.relatedCase.caseTitle || "Case"}
                      </p>
                    </>
                  ) : (
                    <p className="uc-chat-case-title">{otherParticipant?.name || "Chat"}</p>
                  )}
                  {otherTyping && (
                    <span className="uc-typing-label">typing...</span>
                  )}
                </div>
              </div>

              {/* messages */}
              <div className="uc-msg-area">
                {grouped.map((item, idx) => {
                  if (item.type === "date") {
                    return (
                      <div key={`date-${idx}`} className="uc-date-sep">
                        <div className="uc-date-line" />
                        <span className="uc-date-label">{item.label}</span>
                        <div className="uc-date-line" />
                      </div>
                    );
                  }

                  const msg = item;
                  const mine = msg.sender._id === userId;

                  return (
                    <div
                      key={msg._id}
                      className={`uc-msg-wrap uc-msg-wrap--${mine ? "mine" : "theirs"}`}
                      onMouseEnter={() => setHoveredMsg(msg._id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {!mine && (
                        <img
                          className="uc-msg-avatar"
                          src={
                            msg.sender.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name)}&background=5f72f5&color=fff&size=32`
                          }
                          alt={msg.sender.name}
                        />
                      )}

                      <div className="uc-bubble-outer">
                        {/* hover actions */}
                        {hoveredMsg === msg._id && !msg.isDeleted && (
                          <div
                            className={`uc-msg-actions uc-msg-actions--${mine ? "mine" : "theirs"}`}
                          >
                            <button
                              className="uc-action-btn"
                              title="Reply"
                              onClick={() => {
                                setReplyTo(msg);
                                setEditingMsg(null);
                                inputRef.current?.focus();
                              }}
                            >
                              <FaReply />
                            </button>
                            {mine && (
                              <>
                                <button
                                  className="uc-action-btn"
                                  title="Edit"
                                  onClick={() => {
                                    setEditingMsg(msg);
                                    setInput(msg.content);
                                    setReplyTo(null);
                                    inputRef.current?.focus();
                                  }}
                                >
                                  <FaPen />
                                </button>
                                <button
                                  className="uc-action-btn uc-action-btn--danger"
                                  title="Delete"
                                  onClick={() => handleDelete(msg, true)}
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        <div className={`uc-bubble uc-bubble--${mine ? "mine" : "theirs"}`}>
                          {/* reply preview */}
                          {msg.replyTo && !msg.isDeleted && (
                            <div className="uc-bubble-reply">
                              <span className="uc-bubble-reply-name">
                                {msg.replyTo.sender?.name || "User"}
                              </span>
                              <p className="uc-bubble-reply-text">
                                {msg.replyTo.content?.slice(0, 80)}
                              </p>
                            </div>
                          )}

                          {msg.isDeleted ? (
                            <p className="uc-bubble-deleted">This message was deleted</p>
                          ) : (
                            <>
                              {msg.attachment && (
                                <div>
                                  {msg.messageType === "image" ? (
                                    <img
                                      className="uc-attach-img"
                                      src={`${apiBase}${msg.attachment.fileUrl}`}
                                      alt="attachment"
                                      onClick={() =>
                                        window.open(
                                          `${apiBase}${msg.attachment.fileUrl}`,
                                          "_blank"
                                        )
                                      }
                                    />
                                  ) : (
                                    <a
                                      className="uc-attach-file"
                                      href={`${apiBase}${msg.attachment.fileUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <FaFileAlt style={{ flexShrink: 0 }} />
                                      <span className="uc-attach-file-name">
                                        {msg.attachment.fileName}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {msg.content && msg.content !== "File attachment" && (
                                <p className="uc-msg-text">{msg.content}</p>
                              )}
                            </>
                          )}

                          <div className="uc-msg-meta">
                            <span
                              className={`uc-msg-time uc-msg-time--${mine ? "mine" : "theirs"}`}
                            >
                              {fmtTime(msg.createdAt)}
                            </span>
                            {msg.isEdited && !msg.isDeleted && (
                              <span className="uc-msg-edited">edited</span>
                            )}
                            {mine && !msg.isDeleted && (
                              msg.status === "read" ? (
                                <FaCheckDouble className="uc-status-read" />
                              ) : (
                                <FaCheck className="uc-status-sent" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* input area */}
              <div className="uc-input-area">
                {replyTo && (
                  <div className="uc-reply-bar">
                    <div>
                      <span className="uc-bar-label">
                        Replying to {replyTo.sender?.name}
                      </span>
                      <p className="uc-bar-text">{replyTo.content?.slice(0, 80)}</p>
                    </div>
                    <button className="uc-bar-close" onClick={() => setReplyTo(null)}>
                      <FaTimes />
                    </button>
                  </div>
                )}

                {editingMsg && (
                  <div className="uc-edit-bar">
                    <div>
                      <span className="uc-bar-label">Editing message</span>
                      <p className="uc-bar-text">{editingMsg.content?.slice(0, 80)}</p>
                    </div>
                    <button
                      className="uc-bar-close"
                      onClick={() => {
                        setEditingMsg(null);
                        setInput("");
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}

                {file && (
                  <div className="uc-file-preview">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {file.type.startsWith("image/") ? <FaImage /> : <FaFileAlt />}
                      <span style={{ maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button className="uc-bar-close" onClick={() => setFile(null)}>
                      <FaTimes />
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileRef}
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                <div className="uc-input-row">
                  <button
                    className="uc-input-icon-btn"
                    onClick={() => fileRef.current?.click()}
                    title="Attach file"
                  >
                    <FaPaperclip />
                  </button>
                  <input
                    ref={inputRef}
                    className="uc-input-field"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={editingMsg ? "Edit your message..." : "Type a message..."}
                  />
                  <button
                    className="uc-send-btn"
                    onClick={handleSend}
                    disabled={(!input.trim() && !file) || sending}
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="uc-empty-state">
              <FaCommentDots />
              <h3>No conversation selected</h3>
              <p>Pick a chat from the left panel</p>
            </div>
          )}

          {/* ══ RIGHT PANEL ══ */}
          {selected && (
            <div className="uc-right">
              <div className="uc-right-tabs">
                <button
                  className={`uc-tab${rightTab === "info" ? " uc-tab--active" : ""}`}
                  onClick={() => setRightTab("info")}
                >
                  INFO
                </button>
                <button
                  className={`uc-tab${rightTab === "notes" ? " uc-tab--active" : ""}`}
                  onClick={() => setRightTab("notes")}
                >
                  NOTES
                </button>
              </div>

              <div className="uc-right-body">
                {rightTab === "info" ? (
                  <InfoTab caseDetail={caseDetail} caseDocs={caseDocs} />
                ) : (
                  <NotesTab
                    notes={notes}
                    showEditor={showNoteEditor}
                    noteInput={noteInput}
                    noteSaving={noteSaving}
                    editingNote={editingNote}
                    onNoteInput={setNoteInput}
                    onOpenEditor={handleOpenNoteEditor}
                    onSave={handleSaveNote}
                    onCancel={handleCancelNote}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

/* ─── INFO TAB ───────────────────────────────────────────────── */
const InfoTab = ({ caseDetail, caseDocs }) => {
  if (!caseDetail) {
    return (
      <p className="uc-info-no-case">
        No case linked to this conversation.
      </p>
    );
  }

  const c = caseDetail;
  const petitioner = c.petitionerDetails;
  const respondent = c.defendantDetails;
  const mediator = c.assignedNeutral;
  const mediatorName =
    mediator?.fullName || mediator?.name || null;

  return (
    <>
      {/* Case Summary */}
      <div className="uc-info-section">
        <p className="uc-info-section-title">Case Summary</p>
        {c.caseFacts?.caseSummary && (
          <p className="uc-info-summary">{c.caseFacts.caseSummary}</p>
        )}
        <div className="uc-info-fields">
          <div className="uc-info-field">
            <span className="uc-info-field-label">Case ID</span>
            <span className="uc-info-field-value">#{c.caseId || "—"}</span>
          </div>
          {c.caseType && (
            <div className="uc-info-field">
              <span className="uc-info-field-label">Type</span>
              <span className="uc-info-field-value">{c.caseType}</span>
            </div>
          )}
          <div className="uc-info-field">
            <span className="uc-info-field-label">Status</span>
            <span className="uc-info-field-value" style={{ textTransform: "capitalize" }}>
              {c.status || "—"}
            </span>
          </div>
          {c.createdAt && (
            <div className="uc-info-field">
              <span className="uc-info-field-label">Filed</span>
              <span className="uc-info-field-value">
                {new Date(c.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="uc-info-section">
        <p className="uc-info-section-title">Participants</p>

        {petitioner?.fullName && (
          <div className="uc-info-participant">
            <div className="uc-info-pt-avatar">
              {petitioner.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="uc-info-pt-name">{petitioner.fullName}</p>
              <span className="uc-info-pt-role">Petitioner</span>
            </div>
          </div>
        )}

        {respondent?.fullName ? (
          <div className="uc-info-participant">
            <div className="uc-info-pt-avatar">
              {respondent.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="uc-info-pt-name">{respondent.fullName}</p>
              <span className="uc-info-pt-role">Respondent</span>
            </div>
          </div>
        ) : c.respondent?.email ? (
          <div className="uc-info-participant">
            <div className="uc-info-pt-avatar">?</div>
            <div>
              <p className="uc-info-pt-name">-</p>
              <span className="uc-info-pt-role">Respondent</span>
            </div>
          </div>
        ) : null}

        {mediatorName ? (
          <div className="uc-info-participant">
            <div className="uc-info-pt-avatar uc-info-pt-avatar--mediator">
              {mediatorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="uc-info-pt-name">{mediatorName}</p>
              <span className="uc-info-pt-role">Mediator</span>
            </div>
          </div>
        ) : (
          <div className="uc-info-participant">
            <div className="uc-info-pt-avatar uc-info-pt-avatar--mediator">?</div>
            <div>
              <p className="uc-info-pt-name">-</p>
              <span className="uc-info-pt-role">Mediator</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Documents */}
      {caseDocs.length > 0 && (
        <div className="uc-info-section">
          <p className="uc-info-section-title">Recent Documents</p>
          {caseDocs.map((doc, i) => (
            <div key={doc._id || i} className="uc-info-doc">
              <FaFileAlt className="uc-info-doc-icon" />
              <div className="uc-info-doc-info">
                <p className="uc-info-doc-name">{doc.documentTitle || doc.originalFileName || "Document"}</p>
                <p className="uc-info-doc-meta">
                  {doc.createdAt
                    ? new Date(doc.createdAt).toLocaleDateString("en-IN")
                    : ""}
                </p>
              </div>
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uc-info-doc-btn"
                >
                  <FaEye /> View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ─── NOTES TAB ──────────────────────────────────────────────── */
const NotesTab = ({
  notes,
  showEditor,
  noteInput,
  noteSaving,
  editingNote,
  onNoteInput,
  onOpenEditor,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}) => (
  <>
    {!showEditor && (
      <button className="uc-notes-add-btn" onClick={onOpenEditor}>
        <FaPlus /> New Note
      </button>
    )}

    {showEditor && (
      <div className="uc-note-editor">
        <textarea
          className="uc-note-textarea"
          rows={5}
          placeholder="Write your note..."
          value={noteInput}
          onChange={(e) => onNoteInput(e.target.value)}
          autoFocus
        />
        <div className="uc-note-editor-actions">
          <button className="uc-note-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="uc-note-save-btn"
            onClick={onSave}
            disabled={!noteInput.trim() || noteSaving}
          >
            {noteSaving ? "Saving..." : editingNote ? "Update" : "Save Note"}
          </button>
        </div>
      </div>
    )}

    {notes.length === 0 && !showEditor ? (
      <p className="uc-notes-empty">
        No notes yet. Click + New Note to add one.
      </p>
    ) : (
      notes.map((note) => (
        <div key={note._id} className="uc-note-card">
          <p className="uc-note-card-content">{note.content}</p>
          <div className="uc-note-card-footer">
            <span className="uc-note-card-date">
              {note.updatedAt
                ? new Date(note.updatedAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : ""}
            </span>
            <div className="uc-note-card-actions">
              <button className="uc-note-card-btn" onClick={() => onEdit(note)} title="Edit">
                <FaPen /> Edit
              </button>
              <button
                className="uc-note-card-btn uc-note-card-btn--danger"
                onClick={() => onDelete(note._id)}
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        </div>
      ))
    )}
  </>
);

export default UserChats;
