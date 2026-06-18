import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../api/axios";
import { io } from "socket.io-client";
import "./AdminMessages.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";
const PAGE_LIMIT  = 25;

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtMsgTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtConvTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const now  = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return fmtMsgTime(d);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const fmtDateLabel = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const now  = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";
  const diff = now - date;
  if (diff < 2 * 86400000) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const fmtFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const statusMeta = (status = "") => {
  const s = (status || "").toLowerCase();
  if (s.includes("mediat"))  return { label: "Mediation",   cls: "amsg-badge--mediation" };
  if (s.includes("resolv"))  return { label: "Resolved",    cls: "amsg-badge--resolved"  };
  if (s.includes("clos"))    return { label: "Closed",      cls: "amsg-badge--closed"    };
  if (s.includes("reject"))  return { label: "Rejected",    cls: "amsg-badge--rejected"  };
  if (s.includes("hearing")) return { label: "Hearing",     cls: "amsg-badge--hearing"   };
  if (s.includes("in-prog") || s.includes("progress"))
                             return { label: "In Progress", cls: "amsg-badge--progress"  };
  if (s.includes("pending")) return { label: "Pending",     cls: "amsg-badge--pending"   };
  if (s)                     return { label: status,        cls: "amsg-badge--default"   };
  return null;
};

const groupByDate = (messages) => {
  const groups = [];
  let lastKey = "";
  for (const msg of messages) {
    const d   = new Date(msg.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== lastKey) {
      lastKey = key;
      groups.push({ type: "separator", label: fmtDateLabel(msg.createdAt), key });
    }
    groups.push({ type: "message", ...msg });
  }
  return groups;
};

const getParticipantRole = (participant, relatedCase) => {
  if (!relatedCase) return participant.role || "User";
  const pId = participant._id?.toString();
  const claimantId =
    relatedCase.claimant?._id?.toString() || relatedCase.claimant?.toString();
  const respondentId =
    relatedCase.respondent?.userId?._id?.toString() ||
    relatedCase.respondent?.userId?.toString();
  if (pId === claimantId)    return "Petitioner";
  if (pId === respondentId)  return "Respondent";
  const role = (participant.role || "").toLowerCase();
  if (role === "mediator")      return "Mediator";
  if (role === "case-manager")  return "Case Manager";
  if (role === "admin")         return "Admin";
  return "Participant";
};

/* Compute whether admin has new messages since they last read this conversation */
const adminHasNew = (conv, adminUserId) => {
  const lastSent = conv.lastMessage?.sentAt;
  if (!lastSent) return false;
  const lastRead = conv.adminReadState?.[adminUserId];
  if (!lastRead)  return true;
  return new Date(lastSent) > new Date(lastRead);
};

/* ── Avatar helper ───────────────────────────────────────────── */
const Avatar = ({ src, name, size = 40 }) => (
  <div
    style={{
      width: size, height: size, borderRadius: "50%",
      overflow: "hidden", flexShrink: 0,
      background: "#778aff",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
  >
    {src ? (
      <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.3 }}>
        {getInitials(name)}
      </span>
    )}
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
const AdminMessages = () => {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("userId");
  const token    = localStorage.getItem("token");

  /* ── Core state ── */
  const [conversations, setConversations] = useState([]);
  const [convLoading,   setConvLoading]   = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [convPage,      setConvPage]      = useState(1);
  const [convTotal,     setConvTotal]     = useState(0);
  const [convPages,     setConvPages]     = useState(1);
  const [searchInput,   setSearchInput]   = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");

  const [selectedConv,   setSelectedConv]   = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [msgLoading,     setMsgLoading]     = useState(false);
  const [detail,         setDetail]         = useState(null);
  const [detailLoading,  setDetailLoading]  = useState(false);

  const [text,         setText]         = useState("");
  const [sending,      setSending]      = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [archiving,    setArchiving]    = useState(false);

  /* ── Refs ── */
  const messagesEndRef    = useRef(null);
  const fileInputRef      = useRef(null);
  const socketRef         = useRef(null);
  const currentConvIdRef  = useRef(null);
  const searchDebounceRef = useRef(null);

  /* ── Debounce search → triggers fetchConversations via dep ── */
  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  /* ── Socket ── */
  useEffect(() => {
    if (!token) return;
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (userId) socket.emit("user-online", userId);
    });

    socket.on("new-message", ({ conversationId, message }) => {
      const convIdStr  = conversationId?.toString();
      const isViewing  = currentConvIdRef.current === convIdStr;
      const now        = new Date().toISOString();

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id?.toString() !== convIdStr) return c;
          return {
            ...c,
            lastMessage: { text: message.content, sender: message.sender, sentAt: message.createdAt },
            // If viewing now, update adminReadState immediately so dot stays cleared
            ...(isViewing
              ? { adminReadState: { ...(c.adminReadState || {}), [userId]: now } }
              : {}),
          };
        })
      );

      if (isViewing) {
        setMessages((prev) => {
          if (prev.some((m) => m._id?.toString() === message._id?.toString())) return prev;
          return [...prev, message];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
        // Persist admin read when message arrives while viewing
        api.patch(`/chats/admin/conversations/${convIdStr}/read`).catch(() => {});
      }
    });

    return () => socket.disconnect();
  }, [token, userId]);

  /* ── Join conversation room on select ── */
  useEffect(() => {
    if (!selectedConv?._id) return;
    currentConvIdRef.current = selectedConv._id.toString();
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-conversation", selectedConv._id.toString());
    }
  }, [selectedConv?._id]);

  /* ── Fetch conversation list ── */
  const fetchConversations = useCallback(
    async (pageNum = 1, appendMode = false) => {
      if (appendMode) setLoadingMore(true);
      else            setConvLoading(true);
      try {
        const params = { page: pageNum, limit: PAGE_LIMIT };
        if (searchQuery) params.search = searchQuery;
        const res = await api.get("/chats/admin/all", { params });
        const {
          conversations: data = [],
          total = 0,
          pages = 1,
        } = res.data;

        setConversations((prev) => appendMode ? [...prev, ...data] : data);
        setConvTotal(total);
        setConvPages(pages);
        setConvPage(pageNum);
      } catch (err) {
        console.error("fetchConversations error:", err);
      } finally {
        if (appendMode) setLoadingMore(false);
        else            setConvLoading(false);
      }
    },
    [searchQuery]
  );

  /* Run on mount and whenever search changes (searchQuery change recreates the callback) */
  useEffect(() => { fetchConversations(1, false); }, [fetchConversations]);

  /* ── Select conversation ── */
  const handleSelectConv = async (conv) => {
    if (selectedConv?._id === conv._id) return;
    setSelectedConv(conv);
    setMessages([]);
    setDetail(null);
    setText("");
    setAttachedFile(null);
    setMsgLoading(true);
    setDetailLoading(true);

    try {
      const [msgRes, detailRes] = await Promise.all([
        api.get(`/chats/admin/conversations/${conv._id}/messages`),
        api.get(`/chats/admin/conversations/${conv._id}/detail`),
      ]);
      setMessages(msgRes.data.messages || []);
      setDetail({
        conversation: detailRes.data.conversation,
        recentDocs:   detailRes.data.recentDocs || [],
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("handleSelectConv error:", err);
    } finally {
      setMsgLoading(false);
      setDetailLoading(false);
    }

    // Persist admin read timestamp — clears activity dot in DB
    api.patch(`/chats/admin/conversations/${conv._id}/read`)
      .then(() => {
        const now = new Date().toISOString();
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conv._id
              ? { ...c, adminReadState: { ...(c.adminReadState || {}), [userId]: now } }
              : c
          )
        );
      })
      .catch(() => {});
  };

  /* ── Load more ── */
  const handleLoadMore = () => {
    if (convPage < convPages && !loadingMore) {
      fetchConversations(convPage + 1, true);
    }
  };

  /* ── Send message ── */
  const handleSend = async () => {
    if ((!text.trim() && !attachedFile) || !selectedConv || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("content", text.trim() || attachedFile?.name || "File");
      if (attachedFile) formData.append("file", attachedFile);

      const res = await api.post(
        `/chats/admin/conversations/${selectedConv._id}/messages`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const newMsg = res.data.message;

      setMessages((prev) => [...prev, newMsg]);
      setText("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);

      // Update left panel preview and reset activity for this conv
      const now = new Date().toISOString();
      setConversations((prev) =>
        prev.map((c) =>
          c._id === selectedConv._id
            ? {
                ...c,
                lastMessage:    { text: newMsg.content, sender: newMsg.sender, sentAt: newMsg.createdAt },
                adminReadState: { ...(c.adminReadState || {}), [userId]: now },
              }
            : c
        )
      );
    } catch (err) {
      console.error("handleSend error:", err);
    } finally {
      setSending(false);
    }
  };

  /* ── Archive ── */
  const handleArchive = async () => {
    if (!selectedConv) return;
    const label = selectedConv.isArchived ? "Unarchive" : "Archive";
    if (!window.confirm(`${label} this conversation?`)) return;
    setArchiving(true);
    try {
      const res = await api.patch(`/chats/admin/conversations/${selectedConv._id}/archive`);
      const isArchived = res.data.isArchived;
      setSelectedConv((prev) => ({ ...prev, isArchived }));
      setConversations((prev) =>
        prev.map((c) => (c._id === selectedConv._id ? { ...c, isArchived } : c))
      );
    } catch (err) {
      console.error("handleArchive error:", err);
    } finally {
      setArchiving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     SUB-COMPONENTS
  ═══════════════════════════════════════════════════════════════ */

  /* Left panel — conversation item */
  const ConvItem = ({ conv }) => {
    const isSelected = selectedConv?._id === conv._id;
    const cas = conv.relatedCase;
    const sm  = cas ? statusMeta(cas.status) : null;

    // Real admin-specific unread: last message arrived AFTER admin last read this conversation
    const isNew = !isSelected && adminHasNew(conv, userId);

    const others = (conv.participants || []).filter(
      (p) => p._id?.toString() !== userId
    );
    const displayName =
      cas?.caseTitle || others.map((p) => p.name).join(", ") || "Conversation";
    const firstOther  = others[0];
    const preview     = conv.lastMessage?.text || "No messages yet";
    const ts          = fmtConvTime(conv.lastMessage?.sentAt);

    return (
      <div
        className={[
          "amsg-conv-item",
          isSelected      ? "amsg-conv-item--active"   : "",
          conv.isArchived ? "amsg-conv-item--archived" : "",
          isNew           ? "amsg-conv-item--new"      : "",
        ].filter(Boolean).join(" ")}
        onClick={() => handleSelectConv(conv)}
      >
        <Avatar src={firstOther?.avatar} name={firstOther?.name || displayName} size={40} />
        <div className="amsg-conv-info">
          <div className="amsg-conv-top">
            {cas && <span className="amsg-case-chip">#{cas.caseId}</span>}
            {sm  && <span className={`amsg-badge ${sm.cls}`}>{sm.label}</span>}
            {conv.isArchived && <span className="amsg-badge amsg-badge--archived">Archived</span>}
            {isNew && <span className="amsg-new-dot" title="New messages since you last viewed" />}
            <span className="amsg-conv-ts">{ts}</span>
          </div>
          <div className={`amsg-conv-title${isNew ? " amsg-conv-title--new" : ""}`}>{displayName}</div>
          <div className="amsg-conv-preview">{preview}</div>
        </div>
      </div>
    );
  };

  /* Center — message bubble */
  const MsgBubble = ({ msg }) => {
    const senderId  = msg.sender?._id?.toString() || msg.sender?.toString();
    const isMine    = senderId === userId;
    const senderName = msg.sender?.name || "Unknown";
    const hasFile   = !!msg.attachment?.fileUrl;
    const isImage   =
      msg.messageType === "image" ||
      msg.attachment?.mimeType?.startsWith("image/");
    const fileUrl   = hasFile
      ? msg.attachment.fileUrl.startsWith("http")
        ? msg.attachment.fileUrl
        : `${SERVER_URL}${msg.attachment.fileUrl}`
      : null;

    return (
      <div className={`amsg-msg-row ${isMine ? "amsg-msg-row--mine" : "amsg-msg-row--theirs"}`}>
        {!isMine && (
          <div className="amsg-msg-avatar-sm">
            <Avatar src={msg.sender?.avatar} name={senderName} size={28} />
          </div>
        )}
        <div className="amsg-msg-col">
          {!isMine && <div className="amsg-msg-sender">{senderName}</div>}
          {hasFile ? (
            <div className={`amsg-file-card${isMine ? " amsg-file-card--mine" : ""}`}>
              {isImage ? (
                <img src={fileUrl} alt={msg.attachment.fileName} className="amsg-file-img" />
              ) : (
                <div className="amsg-file-info">
                  <span className="amsg-file-icon">📄</span>
                  <div className="amsg-file-details">
                    <span className="amsg-file-name">{msg.attachment.fileName}</span>
                    <span className="amsg-file-size">{fmtFileSize(msg.attachment.fileSize)}</span>
                  </div>
                </div>
              )}
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="amsg-file-view-btn">
                VIEW
              </a>
              {msg.content && msg.content !== msg.attachment?.fileName && (
                <p className="amsg-bubble-text">{msg.content}</p>
              )}
            </div>
          ) : (
            <div className={`amsg-bubble ${isMine ? "amsg-bubble--mine" : "amsg-bubble--theirs"}`}>
              {msg.isDeleted ? (
                <em className="amsg-deleted">This message was deleted</em>
              ) : (
                msg.content
              )}
            </div>
          )}
          <div className={`amsg-msg-time${isMine ? " amsg-msg-time--mine" : ""}`}>
            {fmtMsgTime(msg.createdAt)}
            {msg.isEdited && <span className="amsg-edited"> · edited</span>}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  const msgGroups = groupByDate(messages);
  const rightConv = detail?.conversation;
  const rightCase = rightConv?.relatedCase;
  const sm        = rightCase ? statusMeta(rightCase.status) : null;
  const hasMore   = convPage < convPages;

  return (
    <div className="amsg-root">
      <AdminSidebar />
      <div className="amsg-main">

        {/* ── LEFT: Conversation List ── */}
        <aside className="amsg-left">
          <div className="amsg-left-header">
            <h2 className="amsg-left-title">Messages</h2>
            <div className="amsg-search-wrap">
              <span className="amsg-search-icon">🔍</span>
              <input
                className="amsg-search-input"
                placeholder="Search by name, case, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  className="amsg-search-clear"
                  onClick={() => setSearchInput("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="amsg-conv-list">
            {convLoading ? (
              <div className="amsg-list-loading">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="amsg-list-empty">
                {searchInput ? "No conversations match your search." : "No conversations yet."}
              </div>
            ) : (
              <>
                {conversations.map((c) => <ConvItem key={c._id} conv={c} />)}
                {hasMore && (
                  <div className="amsg-load-more-wrap">
                    <button
                      className="amsg-load-more-btn"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore
                        ? "Loading..."
                        : `Load More (${convTotal - conversations.length} remaining)`}
                    </button>
                  </div>
                )}
                {!hasMore && convTotal > PAGE_LIMIT && (
                  <div className="amsg-list-end">All {convTotal} conversations loaded</div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ── CENTER: Thread + Composer ── */}
        <main className="amsg-center">
          {!selectedConv ? (
            <div className="amsg-empty-state">
              <div className="amsg-empty-icon">💬</div>
              <p>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              <div className="amsg-center-header">
                <h3 className="amsg-center-title">
                  {selectedConv.relatedCase?.caseTitle ||
                    (selectedConv.participants || [])
                      .filter((p) => p._id?.toString() !== userId)
                      .map((p) => p.name).join(", ") ||
                    "Conversation"}
                </h3>
                {selectedConv.relatedCase && (() => {
                  const m = statusMeta(selectedConv.relatedCase.status);
                  return m ? <span className={`amsg-badge ${m.cls}`}>{m.label}</span> : null;
                })()}
              </div>

              <div className="amsg-thread">
                {msgLoading ? (
                  <div className="amsg-thread-loading">Loading messages...</div>
                ) : msgGroups.length === 0 ? (
                  <div className="amsg-thread-empty">No messages yet. Start the conversation.</div>
                ) : (
                  msgGroups.map((item, i) =>
                    item.type === "separator" ? (
                      <div key={`sep-${item.key}`} className="amsg-date-sep">
                        <span>{item.label}</span>
                      </div>
                    ) : (
                      <MsgBubble key={item._id || i} msg={item} />
                    )
                  )
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="amsg-composer">
                {attachedFile && (
                  <div className="amsg-attached-preview">
                    <span>📎 {attachedFile.name}</span>
                    <button
                      className="amsg-attached-remove"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="amsg-composer-row">
                  <button
                    className="amsg-composer-btn"
                    title="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => setAttachedFile(e.target.files[0] || null)}
                  />
                  <span className="amsg-composer-btn" title="Emoji (decorative only)">😊</span>
                  <input
                    className="amsg-composer-input"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className="amsg-send-btn"
                    disabled={sending || (!text.trim() && !attachedFile)}
                    onClick={handleSend}
                  >
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* ── RIGHT: INFO Panel ── */}
        <aside className="amsg-right">
          {!selectedConv ? (
            <div className="amsg-right-empty">Select a conversation to see details</div>
          ) : detailLoading ? (
            <div className="amsg-right-loading">Loading details...</div>
          ) : (
            <>
              {/* Case Summary */}
              {rightCase && (
                <div className="amsg-right-card">
                  <h4 className="amsg-right-card-title">Case Summary</h4>
                  <div className="amsg-case-id-row">
                    <span className="amsg-case-id-chip">#{rightCase.caseId}</span>
                    {sm && <span className={`amsg-badge ${sm.cls}`}>{sm.label}</span>}
                  </div>
                  <p className="amsg-case-title-text">{rightCase.caseTitle}</p>
                  {rightCase.caseFacts?.caseSummary && (
                    <p className="amsg-case-summary">{rightCase.caseFacts.caseSummary}</p>
                  )}
                </div>
              )}

              {/* Participants */}
              <div className="amsg-right-card">
                <h4 className="amsg-right-card-title">Participants</h4>
                <div className="amsg-participants">
                  {(rightConv?.participants || []).map((p) => (
                    <div key={p._id} className="amsg-participant-row">
                      <div className="amsg-participant-avatar">
                        <Avatar src={p.avatar} name={p.name} size={34} />
                      </div>
                      <div className="amsg-participant-info">
                        <span className="amsg-participant-name">{p.name}</span>
                        <span className="amsg-participant-role">
                          {getParticipantRole(p, rightCase)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Documents */}
              {detail?.recentDocs?.length > 0 && (
                <div className="amsg-right-card">
                  <div className="amsg-right-card-header">
                    <h4 className="amsg-right-card-title">Recent Documents</h4>
                    {rightCase?._id && (
                      <button
                        className="amsg-see-all-btn"
                        onClick={() => navigate(`/admin/documents/folder/${rightCase._id}`)}
                      >
                        See All
                      </button>
                    )}
                  </div>
                  {detail.recentDocs.map((doc) => (
                    <a
                      key={doc._id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="amsg-doc-row"
                    >
                      <span className="amsg-doc-icon">📄</span>
                      <div className="amsg-doc-info">
                        <span className="amsg-doc-name">{doc.documentTitle}</span>
                        <span className="amsg-doc-cat">{doc.category}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Archive */}
              <div className="amsg-right-card">
                <button
                  className={`amsg-archive-btn${selectedConv.isArchived ? " amsg-archive-btn--unarchive" : ""}`}
                  onClick={handleArchive}
                  disabled={archiving}
                >
                  {archiving
                    ? "Working..."
                    : selectedConv.isArchived
                    ? "Unarchive Conversation"
                    : "Archive Conversation"}
                </button>
              </div>
            </>
          )}
        </aside>

      </div>
    </div>
  );
};

export default AdminMessages;
