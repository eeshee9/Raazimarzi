// src/pages/UserSupport.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import api from "../api/axios";
import "./UserSupport.css";
import {
  FaEnvelope,
  FaPhone,
  FaTicketAlt,
  FaPlus,
  FaChevronDown,
  FaChevronUp,
  FaEye,
  FaTimes,
  FaCloudUploadAlt,
  FaFile,
  FaFilePdf,
  FaImage,
  FaDownload,
  FaStar,
  FaFilter,
  FaCheckCircle,
  FaShieldAlt,
  FaAngleLeft,
  FaAngleRight,
} from "react-icons/fa";
import { MdOutlineSupportAgent } from "react-icons/md";

const PAGE_SIZE = 5;
const CATEGORIES = ["Account", "Technical", "Payment", "Meeting", "Case"];
const SUPPORT_EMAIL = "support@raazimarzi.com";
const SUPPORT_PHONE = "+91 98765 43210";
const SUPPORT_HOURS = "Mon–Fri: 9 AM – 6 PM";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtBytes = (b) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const statusCfg = (s) =>
  s === "resolved"
    ? { cls: "us-chip us-chip--resolved", label: "Resolved" }
    : { cls: "us-chip us-chip--open", label: "Open" };

const AttachmentIcon = ({ mime = "" }) => {
  if (mime.includes("pdf")) return <FaFilePdf className="us-attach-type-icon us-attach-type-icon--pdf" />;
  if (mime.startsWith("image")) return <FaImage className="us-attach-type-icon us-attach-type-icon--img" />;
  return <FaFile className="us-attach-type-icon" />;
};

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ value, hovered, onHover, onClick }) => (
  <div className="us-stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <FaStar
        key={n}
        className={`us-star${n <= (hovered || value) ? " us-star--filled" : ""}`}
        onMouseEnter={() => onHover(n)}
        onMouseLeave={() => onHover(0)}
        onClick={() => onClick(n)}
      />
    ))}
  </div>
);

// ─── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQSection = ({ faqs }) => {
  const [openIdx, setOpenIdx] = useState(0);

  if (!faqs.length) return null;

  return (
    <div className="us-faq-section">
      <h2 className="us-section-title">Frequently Asked Questions</h2>
      <div className="us-faq-list">
        {faqs.map((faq, i) => {
          const open = openIdx === i;
          return (
            <div key={faq.id} className={`us-faq-item${open ? " us-faq-item--open" : ""}`}>
              <button
                className="us-faq-trigger"
                onClick={() => setOpenIdx(open ? -1 : i)}
              >
                <span>{faq.question}</span>
                {open ? <FaChevronUp className="us-faq-arrow" /> : <FaChevronDown className="us-faq-arrow" />}
              </button>
              {open && <p className="us-faq-answer">{faq.answer}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Ticket Details Modal ─────────────────────────────────────────────────────
const TicketDetailsModal = ({ ticketId, onClose, onRated }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/support/tickets/${ticketId}`);
        setTicket(res.data.ticket);
        if (res.data.ticket.rating) setRatingDone(true);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load ticket");
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    const handle = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  const handleSubmitRating = async () => {
    if (!rating) return;
    setSubmittingRating(true);
    try {
      await api.post(`/support/tickets/${ticketId}/rate`, { rating, comment });
      setRatingDone(true);
      onRated && onRated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const cfg = ticket ? statusCfg(ticket.status) : null;

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div className="us-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="us-modal-header">
          <div>
            <h2 className="us-modal-title">Support Ticket Details</h2>
            {ticket && (
              <div className="us-modal-meta-row">
                <span className="us-modal-ticket-id">Ticket ID: <span className="us-modal-ticket-id-val">{ticket.ticketId}</span></span>
                <span className={cfg.cls}>{cfg.label}</span>
              </div>
            )}
          </div>
          <button className="us-modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        {/* Modal Body */}
        <div className="us-modal-body">
          {loading && (
            <div className="us-loading-inline">
              <div className="us-spinner" />
              <p>Loading ticket…</p>
            </div>
          )}
          {error && <p className="us-error-text">{error}</p>}

          {ticket && (
            <>
              {/* Subject block */}
              <div className="us-modal-card">
                <p className="us-modal-field-label">SUBJECT</p>
                <p className="us-modal-subject">{ticket.subject}</p>
                <div className="us-modal-divider" />
                <div className="us-modal-two-col">
                  <div>
                    <p className="us-modal-field-label">CATEGORY</p>
                    <p className="us-modal-field-val">{ticket.category} Issue</p>
                  </div>
                  <div>
                    <p className="us-modal-field-label">CREATED ON</p>
                    <p className="us-modal-field-val">{fmt(ticket.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Description block */}
              <div className="us-modal-card">
                <p className="us-modal-card-title">
                  <FaFile className="us-modal-card-icon" /> Reported Issue
                </p>
                <div className="us-modal-divider" />
                <p className="us-modal-description">{ticket.description}</p>

                {ticket.attachments?.length > 0 && (
                  <div className="us-modal-attachments">
                    <p className="us-modal-field-label">Attachments ({ticket.attachments.length})</p>
                    {ticket.attachments.map((att, i) => (
                      <div key={i} className="us-attach-card">
                        <AttachmentIcon mime={att.mimeType} />
                        <div className="us-attach-info">
                          <p className="us-attach-name">{att.fileName}</p>
                          {att.fileSize > 0 && (
                            <p className="us-attach-size">{fmtBytes(att.fileSize)}</p>
                          )}
                        </div>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="us-attach-dl"
                          title="Download"
                        >
                          <FaDownload />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolution block (only when resolved) */}
              {ticket.status === "resolved" && ticket.resolution && (
                <div className="us-modal-card us-modal-card--solution">
                  <div className="us-modal-solution-head">
                    <p className="us-modal-card-title us-modal-card-title--purple">
                      <span className="us-sparkle">✦</span> Support Solution
                    </p>
                    <div className="us-modal-resolved-by">
                      <p className="us-modal-field-label" style={{ textAlign: "right" }}>
                        Resolved By: {ticket.resolvedBy || "Support Team"}
                      </p>
                      <p className="us-modal-field-label">{fmt(ticket.resolvedAt)}</p>
                    </div>
                  </div>
                  <p className="us-modal-resolution">
                    &ldquo;{ticket.resolution}&rdquo;
                  </p>
                </div>
              )}

              {/* Rating block (only when resolved and not yet rated) */}
              {ticket.status === "resolved" && !ratingDone && (
                <div className="us-modal-card us-rating-card">
                  <h3 className="us-rating-title">Rate Your Support Experience</h3>
                  <StarRating
                    value={rating}
                    hovered={hovered}
                    onHover={setHovered}
                    onClick={setRating}
                  />
                  <div className="us-rating-comment-wrap">
                    <label className="us-rating-comment-label">Comments (Optional)</label>
                    <textarea
                      className="us-rating-comment"
                      placeholder="How can we improve?"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <button
                    className="us-rating-submit"
                    onClick={handleSubmitRating}
                    disabled={!rating || submittingRating}
                  >
                    {submittingRating ? "Submitting…" : "Submit Rating"}
                  </button>
                </div>
              )}

              {ticket.status === "resolved" && ratingDone && (
                <div className="us-modal-card us-rating-done-card">
                  <FaCheckCircle className="us-rating-done-icon" />
                  <p>Thank you for your feedback!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Submit Ticket Form ────────────────────────────────────────────────────────
const SubmitTicketForm = ({ onSubmitted }) => {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Account");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!subject.trim()) e.subject = "Subject is required";
    if (!description.trim()) e.description = "Description is required";
    if (description.trim().length < 20) e.description = "Please provide more detail (at least 20 characters)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setAttachment(file);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("category", category);
      formData.append("description", description.trim());
      if (attachment) formData.append("attachment", attachment);

      await api.post("/support/tickets", formData);

      setSuccess(true);
      setSubject("");
      setCategory("Account");
      setDescription("");
      setAttachment(null);
      onSubmitted && onSubmitted();

      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="us-submit-success">
        <FaCheckCircle className="us-submit-success-icon" />
        <h3>Ticket Submitted!</h3>
        <p>Our support team will respond within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="us-ticket-form">
      <h2 className="us-form-title">
        <FaTicketAlt className="us-form-title-icon" /> Submit a Ticket
      </h2>

      {/* Subject + Category */}
      <div className="us-form-row">
        <div className="us-form-field">
          <label className="us-form-label">Subject</label>
          <input
            className={`us-form-input${errors.subject ? " us-input--err" : ""}`}
            placeholder="Brief overview of the issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
          />
          {errors.subject && <p className="us-field-err">{errors.subject}</p>}
        </div>
        <div className="us-form-field us-form-field--short">
          <label className="us-form-label">Issue Category</label>
          <div className="us-select-wrap">
            <select
              className="us-form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <FaChevronDown className="us-select-arrow" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="us-form-field">
        <label className="us-form-label">Description</label>
        <textarea
          className={`us-form-textarea${errors.description ? " us-input--err" : ""}`}
          placeholder="Please provide detailed information…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        {errors.description && <p className="us-field-err">{errors.description}</p>}
      </div>

      {/* Dropzone */}
      <div
        className={`us-dropzone${dragOver ? " us-dropzone--over" : ""}${attachment ? " us-dropzone--has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="us-file-input"
          onChange={(e) => setAttachment(e.target.files[0] || null)}
        />
        {attachment ? (
          <div className="us-dropzone-file">
            <FaFile className="us-dropzone-file-icon" />
            <span className="us-dropzone-file-name">{attachment.name}</span>
            <button
              className="us-dropzone-remove"
              onClick={(e) => { e.stopPropagation(); setAttachment(null); }}
            >
              <FaTimes />
            </button>
          </div>
        ) : (
          <>
            <FaCloudUploadAlt className="us-dropzone-icon" />
            <p className="us-dropzone-text">
              Drag and drop files here or{" "}
              <span className="us-dropzone-browse">browse</span>
            </p>
            <p className="us-dropzone-hint">PDF, PNG, JPG (Max 5MB)</p>
          </>
        )}
      </div>

      <button
        className="us-submit-btn"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit Ticket"}
      </button>
    </div>
  );
};

// ─── My Support Tickets Table ──────────────────────────────────────────────────
const MyTicketsTable = ({ refreshKey, onViewTicket }) => {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterCategory !== "all") params.append("category", filterCategory);
      const res = await api.get(`/support/tickets/my?${params}`);
      setTickets(res.data.tickets || []);
      setTotal(res.data.total || 0);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory, refreshKey]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!showFilter) return;
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setShowFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const applyFilter = (status, cat) => {
    setFilterStatus(status);
    setFilterCategory(cat);
    setPage(1);
    setShowFilter(false);
  };

  return (
    <div className="us-tickets-section">
      <div className="us-tickets-header">
        <h2 className="us-section-title us-section-title--inline">My Support Tickets</h2>
        <div className="us-filter-wrap" ref={filterRef}>
          <button
            className={`us-filter-btn${showFilter ? " us-filter-btn--active" : ""}`}
            onClick={() => setShowFilter((o) => !o)}
          >
            <FaFilter /> Filter
          </button>

          {showFilter && (
            <div className="us-filter-panel">
              <div className="us-filter-group">
                <p className="us-filter-group-label">Status</p>
                {["all", "open", "resolved"].map((s) => (
                  <label key={s} className="us-filter-radio-label">
                    <input
                      type="radio"
                      name="filterStatus"
                      value={s}
                      checked={filterStatus === s}
                      onChange={() => applyFilter(s, filterCategory)}
                    />
                    <span>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  </label>
                ))}
              </div>
              <div className="us-filter-group">
                <p className="us-filter-group-label">Category</p>
                {["all", ...CATEGORIES].map((c) => (
                  <label key={c} className="us-filter-radio-label">
                    <input
                      type="radio"
                      name="filterCategory"
                      value={c}
                      checked={filterCategory === c}
                      onChange={() => applyFilter(filterStatus, c)}
                    />
                    <span>{c === "all" ? "All" : c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="us-loading-inline">
          <div className="us-spinner" /><p>Loading tickets…</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="us-tickets-empty">
          <FaTicketAlt className="us-empty-icon" />
          <p>No tickets found</p>
        </div>
      ) : (
        <>
          <div className="us-table-wrap">
            <table className="us-table">
              <thead>
                <tr>
                  <th>TICKET ID</th>
                  <th>SUBJECT</th>
                  <th>CATEGORY</th>
                  <th>CREATED DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const cfg = statusCfg(t.status);
                  return (
                    <tr key={t._id}>
                      <td className="us-ticket-id-cell">#{t.ticketId}</td>
                      <td className="us-ticket-subject-cell">{t.subject}</td>
                      <td>{t.category}</td>
                      <td>{fmt(t.createdAt)}</td>
                      <td><span className={cfg.cls}>{cfg.label}</span></td>
                      <td>
                        <button
                          className="us-view-btn"
                          onClick={() => onViewTicket(t._id)}
                          title="View ticket"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="us-pagination">
            <span className="us-pagination-info">
              Showing {start}–{end} of {total} tickets
            </span>
            <div className="us-pagination-controls">
              <button
                className="us-page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <FaAngleLeft />
              </button>
              <button
                className="us-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <FaAngleRight />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SUPPORT CENTER
// ══════════════════════════════════════════════════════════════════════════════
const SupportCenter = () => {
  const [faqs, setFaqs] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const formSectionRef = useRef(null);

  useEffect(() => {
    api.get("/support/faqs")
      .then((res) => setFaqs(res.data.faqs || []))
      .catch(() => {});
  }, []);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRated = () => setRefreshKey((k) => k + 1);

  return (
    <div className="us-page">
      {/* ── Page Header ── */}
      <div className="us-page-header">
        <div>
          <h1 className="us-page-title">Support Center</h1>
          <p className="us-page-sub">
            Get help with platform-related issues, payments, meetings, and account support.
          </p>
        </div>
        <button className="us-create-btn" onClick={scrollToForm}>
          <FaPlus /> Create Support Ticket
        </button>
      </div>

      {/* ── Notice Banner ── */}
      <div className="us-notice-banner">
        <FaShieldAlt className="us-notice-icon" />
        <p>
          <strong>Platform Support Only</strong> — Our support team can assist with account issues,
          payments, meetings, document uploads, and technical problems.{" "}
          <strong>We do not provide legal advice.</strong>
        </p>
      </div>

      {/* ── Contact Cards ── */}
      <div className="us-contact-cards">
        <div className="us-contact-card">
          <div className="us-contact-icon-wrap">
            <FaEnvelope className="us-contact-icon" />
          </div>
          <h3 className="us-contact-title">Email Support</h3>
          <p className="us-contact-detail">{SUPPORT_EMAIL}</p>
          <p className="us-contact-meta">Response time: &lt; 24 hours</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="us-contact-btn">
            Send Email
          </a>
        </div>

        <div className="us-contact-card">
          <div className="us-contact-icon-wrap">
            <FaPhone className="us-contact-icon" />
          </div>
          <h3 className="us-contact-title">Phone Support</h3>
          <p className="us-contact-detail">{SUPPORT_PHONE}</p>
          <p className="us-contact-meta">{SUPPORT_HOURS}</p>
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="us-contact-btn">
            Call Support
          </a>
        </div>
      </div>

      {/* ── Form + FAQ side by side ── */}
      <div className="us-form-faq-grid" ref={formSectionRef}>
        <SubmitTicketForm onSubmitted={() => setRefreshKey((k) => k + 1)} />
        <FAQSection faqs={faqs} />
      </div>

      {/* ── My Tickets Table ── */}
      <MyTicketsTable
        refreshKey={refreshKey}
        onViewTicket={(id) => setSelectedTicketId(id)}
      />

      {/* ── Ticket Details Modal ── */}
      {selectedTicketId && (
        <TicketDetailsModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onRated={handleRated}
        />
      )}
    </div>
  );
};

// ── Root component (shell wrapper) ─────────────────────────────────────────────
const UserSupport = () => (
  <div className="us-shell">
    <UserSidebar activePage="support" />
    <div className="us-main">
      <UserNavbar />
      <div className="us-content">
        <SupportCenter />
      </div>
    </div>
  </div>
);

export default UserSupport;
