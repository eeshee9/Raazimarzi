// src/pages/MediatorMessages.js — Mediator Messages module (full implementation)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import {
  Search, Send, Paperclip, MessageSquare, X,
  FileText, Download, AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorMessages.css";

const API = process.env.REACT_APP_API_URL || "/api";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || window.location.origin;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const fmtRelative = (d) => {
  if (!d) return "";
  const now = new Date();
  const date = new Date(d);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return fmtTime(d);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const fmtDateHeader = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

const getInitials = (name) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const STATUS_COLORS = {
  "mediation":    { bg: "#EFF6FF", color: "#2563EB" },
  "in-progress":  { bg: "#FFF7ED", color: "#D97706" },
  "Assigned":     { bg: "#ECFDF5", color: "#16A34A" },
  "Resolved":     { bg: "#F0FDF4", color: "#15803D" },
  "Closed":       { bg: "#F9FAFB", color: "#6B7280" },
  "Rejected":     { bg: "#FEF2F2", color: "#DC2626" },
  "default":      { bg: "#F5F3FF", color: "#7C3AED" },
};

const statusStyle = (s) => STATUS_COLORS[s] || STATUS_COLORS.default;

const isPdf = (url) => url?.toLowerCase().endsWith(".pdf");

const fmtFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// Group messages by calendar day for date separators
const groupByDate = (messages) => {
  const groups = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) {
      groups.push({ type: "separator", date: msg.createdAt });
      lastDay = day;
    }
    groups.push({ type: "message", data: msg });
  }
  return groups;
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

const Avatar = ({ name, src, size = 36, className = "" }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`mm-avatar mm-avatar-img ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`mm-avatar mm-avatar-initials ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  );
};

const ConvRow = ({ conv, active, onClick }) => {
  const other = conv.other;
  const cas = conv.relatedCase;
  const preview = conv.lastMessage?.text || "No messages yet";
  const ts = conv.lastMessage?.sentAt;
  const unread = conv.unreadCount || 0;
  const status = cas?.status;
  const ss = statusStyle(status);

  return (
    <button
      className={`mm-conv-row ${active ? "mm-conv-row--active" : ""}`}
      onClick={onClick}
    >
      <div className="mm-conv-row-left-bar" />
      <div className="mm-conv-row-body">
        <div className="mm-conv-row-top">
          <span className="mm-conv-row-ref">
            {cas?.caseId ? `#${cas.caseId}` : other?.name || "Admin"}
          </span>
          {status && (
            <span
              className="mm-conv-row-badge"
              style={{ background: ss.bg, color: ss.color }}
            >
              {status}
            </span>
          )}
        </div>
        <div className="mm-conv-row-title">
          {cas?.caseTitle || other?.name || "Conversation"}
        </div>
        <div className="mm-conv-row-bottom">
          <span className="mm-conv-row-preview">
            {other?.role === "admin" ? "Admin: " : `${other?.name?.split(" ")[0] || ""}:`} {preview.slice(0, 42)}{preview.length > 42 ? "…" : ""}
          </span>
          <span className="mm-conv-row-ts">{fmtRelative(ts)}</span>
        </div>
      </div>
      {unread > 0 && <span className="mm-conv-row-unread">{unread}</span>}
    </button>
  );
};

const AttachmentBubble = ({ attachment }) => {
  const { fileName, fileUrl, fileSize, mimeType } = attachment;
  const isImage = mimeType?.startsWith("image/");
  const fullUrl = fileUrl?.startsWith("/") ? `${SOCKET_URL}${fileUrl}` : fileUrl;

  if (isImage) {
    return (
      <a href={fullUrl} target="_blank" rel="noreferrer" className="mm-attach-image-link">
        <img src={fullUrl} alt={fileName} className="mm-attach-image" />
      </a>
    );
  }

  return (
    <div className="mm-attach-file">
      <div className="mm-attach-file-icon">
        <FileText size={20} />
      </div>
      <div className="mm-attach-file-info">
        <span className="mm-attach-file-name">{fileName}</span>
        {fileSize && <span className="mm-attach-file-size">{fmtFileSize(fileSize)}</span>}
      </div>
      <a
        href={fullUrl}
        target="_blank"
        rel="noreferrer"
        className="mm-attach-view-btn"
      >
        {isPdf(fileUrl) ? "VIEW" : <Download size={14} />}
      </a>
    </div>
  );
};

const MessageBubble = ({ msg, isMine }) => {
  const isDeleted = msg.isDeleted;
  const hasAttachment = msg.attachment?.fileUrl;

  return (
    <div className={`mm-msg-wrap ${isMine ? "mm-msg-wrap--mine" : ""}`}>
      {!isMine && (
        <Avatar
          name={msg.sender?.name}
          src={msg.sender?.avatar}
          size={32}
          className="mm-msg-avatar"
        />
      )}
      <div className={`mm-msg-content ${isMine ? "mm-msg-content--mine" : ""}`}>
        {!isMine && (
          <span className="mm-msg-sender-name">{msg.sender?.name}</span>
        )}
        {hasAttachment && <AttachmentBubble attachment={msg.attachment} />}
        {!isDeleted && msg.content && (
          <div className={`mm-msg-bubble ${isMine ? "mm-msg-bubble--mine" : ""}`}>
            {msg.content}
          </div>
        )}
        {isDeleted && (
          <div className="mm-msg-bubble mm-msg-bubble--deleted">
            This message was deleted
          </div>
        )}
        <span className="mm-msg-time">{fmtTime(msg.createdAt)}</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MediatorMessages = () => {
  const [conversations, setConversations]   = useState([]);
  const [activeConv, setActiveConv]         = useState(null);
  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState("");
  const [search, setSearch]                 = useState("");
  const [suggestions, setSuggestions]       = useState([]);
  const [showSugg, setShowSugg]             = useState(false);
  const [loading, setLoading]               = useState(true);
  const [threadLoading, setThreadLoading]   = useState(false);
  const [sending, setSending]               = useState(false);
  const [listError, setListError]           = useState(null);
  const [threadError, setThreadError]       = useState(null);
  const [sendError, setSendError]           = useState(null);
  const [filtered, setFiltered]             = useState(null); // null = show all

  const myId        = localStorage.getItem("userId") || "";
  const token       = localStorage.getItem("token")  || "";
  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const searchTimer = useRef(null);
  const activeConvIdRef = useRef(null);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("new-message", ({ conversationId, message }) => {
      // Append to thread if this conversation is open
      if (conversationId === activeConvIdRef.current) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          return exists ? prev : [...prev, message];
        });
      }
      // Update conversation list preview
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: { text: message.content, sentAt: message.createdAt },
                unreadCount:
                  conversationId !== activeConvIdRef.current
                    ? (c.unreadCount || 0) + 1
                    : 0,
              }
            : c
        )
      );
    });

    return () => socket.disconnect();
  }, [token]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load conversation list ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data } = await axiosInstance.get("/mediator/messages");
      setConversations(data.conversations || []);
    } catch {
      setListError("Failed to load conversations. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Open conversation ───────────────────────────────────────────────────────
  const openConversation = useCallback(async (conv) => {
    if (activeConvIdRef.current) {
      socketRef.current?.emit("leave-conversation", activeConvIdRef.current);
    }
    setActiveConv(conv);
    activeConvIdRef.current = conv._id;
    setMessages([]);
    setThreadError(null);
    setSendError(null);
    setThreadLoading(true);

    socketRef.current?.emit("join-conversation", conv._id);

    try {
      const { data } = await axiosInstance.get(`/mediator/messages/${conv._id}`);
      setMessages(data.messages || []);
    } catch {
      setThreadError("Failed to load messages.");
    } finally {
      setThreadLoading(false);
    }

    // Mark read
    try {
      await axiosInstance.patch(`/mediator/messages/${conv._id}/read`);
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
      );
    } catch {}
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const content = text.trim();
    if (!content || !activeConv || sending) return;

    setSending(true);
    setSendError(null);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      content,
      sender: { _id: myId, name: "You" },
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");

    try {
      const { data } = await axiosInstance.post(
        `/mediator/messages/${activeConv._id}`,
        { content }
      );
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? data.message : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConv._id
            ? {
                ...c,
                lastMessage: { text: content, sentAt: new Date().toISOString() },
              }
            : c
        )
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setText(content);
      setSendError("Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── File attach ─────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    const form = new FormData();
    form.append("file", file);
    form.append("content", file.name);
    try {
      const { data } = await axiosInstance.post(
        `/mediator/messages/${activeConv._id}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMessages((prev) => [...prev, data.message]);
    } catch {
      setSendError("File upload failed.");
    }
    e.target.value = "";
  };

  // ── Search / suggestions ────────────────────────────────────────────────────
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setFiltered(null);
      setSuggestions([]);
      setShowSugg(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get(
          `/mediator/messages/search?q=${encodeURIComponent(val.trim())}`
        );
        setFiltered(data.conversations || []);
        setSuggestions(data.suggestions || []);
        setShowSugg((data.suggestions || []).length > 0);
      } catch {}
    }, 350);
  };

  const handleSuggestionClick = async (sug) => {
    setShowSugg(false);
    setSearch("");
    setFiltered(null);
    // Find conversation linked to this case in the list, or just reload
    const match = conversations.find(
      (c) => c.relatedCase?._id === sug.caseObjectId?.toString() ||
             c.relatedCase?.caseId === sug.caseId
    );
    if (match) {
      openConversation(match);
    } else {
      // Case exists but no conversation yet — not creating blindly; just filter to show
      await loadConversations();
    }
  };

  // ── Displayed list (filtered vs full) ──────────────────────────────────────
  const displayList = filtered !== null ? filtered : conversations;

  // ── Topbar search element ───────────────────────────────────────────────────
  const topbarSearch = (
    <div className="mm-search-wrap">
      <Search size={16} className="mm-search-icon" />
      <input
        className="mm-search-input"
        placeholder="Search cases, parties or dispute type…"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowSugg(false), 180)}
        onFocus={() => suggestions.length > 0 && setShowSugg(true)}
      />
      {search && (
        <button
          className="mm-search-clear"
          onClick={() => { setSearch(""); setFiltered(null); setSuggestions([]); setShowSugg(false); }}
        >
          <X size={14} />
        </button>
      )}
      {showSugg && suggestions.length > 0 && (
        <div className="mm-suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="mm-suggestion-row"
              onMouseDown={() => handleSuggestionClick(s)}
            >
              <span className="mm-sug-case">{s.caseId}</span>
              <span className="mm-sug-title">{s.caseTitle}</span>
              <span className="mm-sug-type">{s.caseType}</span>
              {s.partyName && <span className="mm-sug-party">{s.partyName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Grouped messages for date separators ────────────────────────────────────
  const grouped = groupByDate(messages);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <MediatorLayout topbarLeft={topbarSearch}>
      <div className="mm-page">
        {/* Page title */}
        <div className="mm-page-header">
          <h1 className="mm-page-title">My Messages</h1>
          <p className="mm-page-sub">Manage all the groups and messages across the platform</p>
        </div>

        <div className="mm-body">
          {/* ── Left panel: conversation list ── */}
          <aside className="mm-left">
            <div className="mm-left-head">
              <span className="mm-left-title">Messages</span>
              <button
                className="mm-refresh-btn"
                onClick={loadConversations}
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loading ? (
              <div className="mm-list-state">
                <Loader2 size={22} className="mm-spin" />
              </div>
            ) : listError ? (
              <div className="mm-list-state mm-list-state--error">
                <AlertCircle size={18} />
                <span>{listError}</span>
                <button className="mm-retry-btn" onClick={loadConversations}>
                  Retry
                </button>
              </div>
            ) : displayList.length === 0 ? (
              <div className="mm-list-state mm-list-state--empty">
                <MessageSquare size={28} />
                <span>
                  {search
                    ? "No conversations match your search"
                    : "No conversations yet"}
                </span>
              </div>
            ) : (
              <div className="mm-conv-list">
                {displayList.map((conv) => (
                  <ConvRow
                    key={conv._id}
                    conv={conv}
                    active={activeConv?._id === conv._id}
                    onClick={() => openConversation(conv)}
                  />
                ))}
              </div>
            )}
          </aside>

          {/* ── Right panel: message thread ── */}
          <section className="mm-right">
            {!activeConv ? (
              <div className="mm-empty-thread">
                <MessageSquare size={40} />
                <p>Select a conversation to start messaging</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="mm-thread-header">
                  <Avatar
                    name={activeConv.other?.name}
                    src={activeConv.other?.avatar}
                    size={38}
                  />
                  <div className="mm-thread-header-info">
                    <span className="mm-thread-header-name">
                      {activeConv.other?.name || "Admin"}
                    </span>
                    {activeConv.relatedCase?.caseId && (
                      <span className="mm-thread-header-ref">
                        {activeConv.relatedCase.caseId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages area */}
                <div className="mm-thread-body">
                  {threadLoading ? (
                    <div className="mm-thread-state">
                      <Loader2 size={22} className="mm-spin" />
                    </div>
                  ) : threadError ? (
                    <div className="mm-thread-state mm-thread-state--error">
                      <AlertCircle size={18} />
                      <span>{threadError}</span>
                      <button
                        className="mm-retry-btn"
                        onClick={() => openConversation(activeConv)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mm-thread-state">
                      <MessageSquare size={28} />
                      <span>No messages yet. Start the conversation.</span>
                    </div>
                  ) : (
                    <>
                      {grouped.map((item, idx) => {
                        if (item.type === "separator") {
                          return (
                            <div key={`sep-${idx}`} className="mm-date-sep">
                              <span>{fmtDateHeader(item.date)}</span>
                            </div>
                          );
                        }
                        const msg = item.data;
                        const isMine =
                          (msg.sender?._id || msg.sender) === myId;
                        return (
                          <MessageBubble
                            key={msg._id}
                            msg={msg}
                            isMine={isMine}
                          />
                        );
                      })}
                      <div ref={bottomRef} />
                    </>
                  )}
                </div>

                {/* Composer */}
                <div className="mm-composer">
                  {sendError && (
                    <div className="mm-send-error">
                      <AlertCircle size={13} /> {sendError}
                    </div>
                  )}
                  <div className="mm-composer-row">
                    <button
                      className="mm-composer-attach"
                      onClick={() => fileRef.current?.click()}
                      title="Attach file"
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
                    />
                    <textarea
                      className="mm-composer-input"
                      placeholder="Type your message…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                    />
                    <button
                      className={`mm-composer-send ${!text.trim() || sending ? "mm-composer-send--disabled" : ""}`}
                      onClick={sendMessage}
                      disabled={!text.trim() || sending}
                    >
                      {sending ? <Loader2 size={16} className="mm-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorMessages;
