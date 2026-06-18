// src/pages/AdminSupportTicket.js — aspt- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaBell, FaSearch, FaArrowLeft, FaBriefcase } from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminSupportTicket.css";

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtDateTime = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day   = date.getDate();
  const time  = date.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  return `${month} ${day}, ${time}`;
};

const CATEGORY_LABELS = {
  Account:   "Account Access",
  Technical: "Technical Support",
  Payment:   "Billing & Payments",
  Meeting:   "Meeting Support",
  Case:      "Case Dispute",
};

const STATUS_CFG = {
  open:     { label: "Open",     cls: "aspt-status--open"     },
  resolved: { label: "Resolved", cls: "aspt-status--resolved" },
};

const ROLE_LABELS = {
  user:           "Client",
  mediator:       "Mediator",
  arbitrator:     "Arbitrator",
  "case-manager": "Case Manager",
  admin:          "Administrator",
};

const initials = (name = "") =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* ── Avatar component ────────────────────────────────────────── */
const Avatar = ({ src, name, className, initialsClass }) =>
  src ? (
    <img src={src} alt={name} className={className} />
  ) : (
    <div className={`${className} ${initialsClass}`}>{initials(name)}</div>
  );

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminSupportTicket = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [ticket,    setTicket]    = useState(null);
  const [reply,     setReply]     = useState("");
  const [resolving, setResolving] = useState(false);
  const [replyErr,  setReplyErr]  = useState("");

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar =
    localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  /* ── Fetch ticket ── */
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/support/admin/tickets/${id}`);
      setTicket(res.data.ticket);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchTicket();
  }, [navigate, fetchTicket]);

  /* ── Resolve ticket ── */
  const handleResolve = async () => {
    if (!reply.trim()) {
      setReplyErr("Please type a resolution message before resolving.");
      return;
    }
    setReplyErr("");
    setResolving(true);
    try {
      await api.patch(`/support/tickets/${id}/resolve`, { resolution: reply.trim() });
      setReply("");
      await fetchTicket();
    } catch (e) {
      setReplyErr(e.response?.data?.message || "Failed to resolve ticket. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const isResolved = ticket?.status === "resolved";
  const statusCfg  = STATUS_CFG[ticket?.status] || { label: ticket?.status, cls: "aspt-status--open" };

  return (
    <div className="aspt-root">
      <AdminSidebar />
      <div className="aspt-main">

        {/* Topbar */}
        <header className="aspt-topbar">
          <form className="aspt-search-form" onSubmit={(e) => e.preventDefault()}>
            <FaSearch className="aspt-search-icon" />
            <input
              className="aspt-search-input"
              placeholder="Search cases, mediators or meetings..."
              readOnly
            />
          </form>
          <div className="aspt-topbar-right">
            <button className="aspt-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="aspt-admin-avatar" />
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="aspt-loading">Loading ticket…</div>
        ) : error ? (
          <div className="aspt-error-wrap">
            <p className="aspt-error-msg">{error}</p>
            <button className="aspt-retry-btn" onClick={fetchTicket}>Retry</button>
          </div>
        ) : ticket ? (
          <div className="aspt-body">

            {/* Back */}
            <button className="aspt-back-btn" onClick={() => navigate("/admin/support")}>
              <FaArrowLeft /> Back to Support
            </button>

            {/* Header */}
            <div className="aspt-header">
              <span className="aspt-ticket-chip">TICKET #{ticket.ticketId}</span>
              <span className={`aspt-status-chip ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
            <h2 className="aspt-subject">{ticket.subject}</h2>

            {/* Two-column layout */}
            <div className="aspt-layout">

              {/* ── Left: conversation ── */}
              <div className="aspt-left">

                {/* Original message */}
                <div className="aspt-msg-card">
                  <div className="aspt-msg-head">
                    <Avatar
                      src={ticket.userId?.avatar}
                      name={ticket.userId?.name}
                      className="aspt-msg-avatar"
                      initialsClass="aspt-msg-avatar--initials"
                    />
                    <div className="aspt-msg-meta">
                      <span className="aspt-msg-name">{ticket.userId?.name || "User"}</span>
                      <span className="aspt-msg-time">{fmtDateTime(ticket.createdAt)}</span>
                    </div>
                  </div>
                  <p className="aspt-msg-body">{ticket.description}</p>
                  {ticket.attachments?.length > 0 && (
                    <div className="aspt-attachments">
                      {ticket.attachments.map((a, i) => (
                        <a
                          key={i}
                          href={a.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspt-attachment-link"
                        >
                          📎 {a.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved: internal activity thread */}
                {isResolved && ticket.resolution && (
                  <>
                    <div className="aspt-activity-divider">
                      <span className="aspt-activity-label">LOGGED INTERNAL ACTIVITY</span>
                    </div>

                    <div className="aspt-msg-card aspt-msg-card--activity">
                      <div className="aspt-msg-head">
                        <div className="aspt-msg-avatar aspt-msg-avatar--admin">
                          {initials(ticket.resolvedBy || adminName)}
                        </div>
                        <div className="aspt-msg-meta">
                          <span className="aspt-msg-name aspt-msg-name--admin">
                            {ticket.resolvedBy || adminName}
                          </span>
                          <span className="aspt-msg-time">
                            {fmtDateTime(ticket.resolvedAt)}
                          </span>
                        </div>
                      </div>
                      <p className="aspt-msg-body">{ticket.resolution}</p>
                    </div>
                  </>
                )}

                {/* Open: reply composer */}
                {!isResolved && (
                  <div className="aspt-composer">
                    {/* Toolbar — formatting controls not supported in plain text replies */}
                    <div className="aspt-toolbar">
                      <span className="aspt-toolbar-btn aspt-toolbar-btn--disabled" title="Formatting not supported in admin replies">
                        <strong>B</strong>
                      </span>
                      <span className="aspt-toolbar-btn aspt-toolbar-btn--disabled" title="Formatting not supported">
                        <em>I</em>
                      </span>
                      <span className="aspt-toolbar-btn aspt-toolbar-btn--disabled" title="Links not supported">
                        🔗
                      </span>
                      <span className="aspt-toolbar-btn aspt-toolbar-btn--disabled" title="Lists not supported">
                        ≡
                      </span>
                      <span
                        className="aspt-toolbar-macros aspt-toolbar-btn--disabled"
                        title="No macros configured"
                      >
                        🕐 Macros
                      </span>
                    </div>

                    <textarea
                      className={`aspt-textarea ${replyErr ? "aspt-textarea--error" : ""}`}
                      placeholder="Type your reply here..."
                      value={reply}
                      onChange={(e) => { setReply(e.target.value); setReplyErr(""); }}
                      rows={6}
                    />

                    {replyErr && <p className="aspt-reply-err">{replyErr}</p>}

                    <div className="aspt-composer-footer">
                      {/* Attach disabled — resolveTicket endpoint doesn't accept attachments */}
                      <span
                        className="aspt-attach-disabled"
                        title="Attachments are not supported in admin replies"
                      >
                        📎 Attach
                      </span>

                      <button
                        className="aspt-resolve-btn"
                        onClick={handleResolve}
                        disabled={resolving}
                      >
                        {resolving ? "Resolving…" : "Resolve Ticket ▶"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right: sidebar ── */}
              <div className="aspt-right">

                {/* User Information */}
                <div className="aspt-sidebar-card">
                  <h4 className="aspt-sidebar-title">USER INFORMATION</h4>

                  <div className="aspt-user-block">
                    <Avatar
                      src={ticket.userId?.avatar}
                      name={ticket.userId?.name}
                      className="aspt-user-avatar"
                      initialsClass="aspt-user-avatar--initials"
                    />
                    <div>
                      <p className="aspt-user-name">{ticket.userId?.name || "—"}</p>
                      <p className="aspt-user-tier">
                        {ROLE_LABELS[ticket.userId?.role] || "Client"}
                      </p>
                    </div>
                  </div>

                  <div className="aspt-user-fields">
                    <div className="aspt-user-field">
                      <span className="aspt-field-key">Email</span>
                      <span className="aspt-field-val aspt-field-val--email">
                        {ticket.userId?.email || "—"}
                      </span>
                    </div>
                    <div className="aspt-user-field">
                      <span className="aspt-field-key">Phone</span>
                      <span className="aspt-field-val">
                        {ticket.userId?.phone || "—"}
                      </span>
                    </div>
                    <div className="aspt-user-field">
                      <span className="aspt-field-key">Active Cases</span>
                      <span className="aspt-field-val aspt-field-val--cases">
                        <FaBriefcase className="aspt-cases-icon" />
                        {ticket.activeCases ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ticket Metadata */}
                <div className="aspt-sidebar-card">
                  <h4 className="aspt-sidebar-title">TICKET METADATA</h4>

                  <div className="aspt-meta-field aspt-meta-field--category">
                    <span className="aspt-meta-key">CATEGORY</span>
                    <div className="aspt-category-val">
                      <span className="aspt-category-icon">☑</span>
                      <span className="aspt-category-label">
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </span>
                    </div>
                  </div>

                  <div className="aspt-meta-field">
                    <span className="aspt-meta-key">Created</span>
                    <span className="aspt-meta-val">{fmtDateTime(ticket.createdAt)}</span>
                  </div>

                  {isResolved && (
                    <div className="aspt-meta-field">
                      <span className="aspt-meta-key">Last Update</span>
                      <span className="aspt-meta-val">{fmtDateTime(ticket.updatedAt)}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminSupportTicket;
