// src/pages/AdminMediatorDetails.js — amd- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaCheckCircle, FaClock, FaTimesCircle,
  FaBriefcase, FaUserTie, FaStar, FaCalendarAlt,
  FaEnvelope, FaPhone, FaFileAlt, FaEye,
  FaTimes, FaCheck,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import AdminAssignCaseModal from "../components/AdminAssignCaseModal";
import "./AdminMediatorDetails.css";

/* ── Helpers ─────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const CASE_STATUS_META = {
  "in-progress":  { label: "In Progress",  color: "#3b82f6", bg: "rgba(59,130,246,0.09)" },
  "Assigned":     { label: "Assigned",      color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
  mediation:      { label: "Mediation",     color: "#0ea5e9", bg: "rgba(14,165,233,0.09)" },
  arbitration:    { label: "Arbitration",   color: "#6366f1", bg: "rgba(99,102,241,0.09)" },
  Hearing:        { label: "Hearing",       color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
  hearing:        { label: "Hearing",       color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
  Resolved:       { label: "Resolved",      color: "#22c55e", bg: "rgba(34,197,94,0.09)"  },
  resolved:       { label: "Resolved",      color: "#22c55e", bg: "rgba(34,197,94,0.09)"  },
  awarded:        { label: "Awarded",       color: "#22c55e", bg: "rgba(34,197,94,0.09)"  },
  Rejected:       { label: "Rejected",      color: "#ef4444", bg: "rgba(239,68,68,0.09)"  },
  rejected:       { label: "Rejected",      color: "#ef4444", bg: "rgba(239,68,68,0.09)"  },
  withdrawn:      { label: "Withdrawn",     color: "#f59e0b", bg: "rgba(245,158,11,0.09)" },
  Closed:         { label: "Closed",        color: "#6b7280", bg: "rgba(107,114,128,0.09)"},
  closed:         { label: "Closed",        color: "#6b7280", bg: "rgba(107,114,128,0.09)"},
  pending:        { label: "Pending",       color: "#f59e0b", bg: "rgba(245,158,11,0.09)" },
};

const APPROVAL_META = {
  approved: { label: "Approved",       icon: FaCheckCircle, color: "#22c55e", bg: "rgba(34,197,94,0.09)"   },
  pending:  { label: "Pending Review", icon: FaClock,       color: "#f59e0b", bg: "rgba(245,158,11,0.09)"  },
  rejected: { label: "Rejected",       icon: FaTimesCircle, color: "#ef4444", bg: "rgba(239,68,68,0.09)"   },
};

const DOC_STATUS_META = {
  verified: { label: "Verified",  color: "#22c55e" },
  pending:  { label: "Pending",   color: "#f59e0b" },
  rejected: { label: "Rejected",  color: "#ef4444" },
};

/* ── Metric card ── */
const MetricCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="amd-metric-card">
    <div className="amd-metric-icon" style={{ background: accent }}>
      <Icon />
    </div>
    <div>
      <p className="amd-metric-label">{label}</p>
      <p className="amd-metric-value">{value}</p>
      {sub && <p className="amd-metric-sub">{sub}</p>}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
const AdminMediatorDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [mediator,       setMediator]       = useState(null);
  const [stats,          setStats]          = useState({ totalCases: 0, activeCases: 0, successRate: 0 });
  const [cases,          setCases]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [actionBusy,     setActionBusy]     = useState(false);

  const [showAssignModal,   setShowAssignModal]   = useState(false);
  const [showRejectInput,   setShowRejectInput]   = useState(false);
  const [rejectNote,        setRejectNote]        = useState("");
  const [toast,             setToast]             = useState(null);

  /* ── Fetch detail ── */
  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/admin/mediators/${id}/detail`);
      const d   = res.data;
      setMediator(d.mediator);
      setStats(d.stats);
      setCases(d.cases || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load mediator.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchDetail();
  }, [navigate, fetchDetail]);

  /* ── Toast helper ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Approve ── */
  const handleApprove = async () => {
    if (!window.confirm(`Approve ${mediator?.name} as a mediator?`)) return;
    setActionBusy(true);
    try {
      await api.patch(`/admin/mediators/${id}/approve`);
      await fetchDetail();
      showToast(`${mediator?.name} has been approved.`);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to approve.");
    } finally {
      setActionBusy(false);
    }
  };

  /* ── Reject ── */
  const handleReject = async () => {
    if (!rejectNote.trim()) { alert("Please enter a rejection reason."); return; }
    setActionBusy(true);
    try {
      await api.patch(`/admin/mediators/${id}/reject`, { reason: rejectNote });
      await fetchDetail();
      setShowRejectInput(false); setRejectNote("");
      showToast(`${mediator?.name} has been rejected.`);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to reject.");
    } finally {
      setActionBusy(false);
    }
  };

  /* ── Suspend / Activate ── */
  const handleToggleActive = async () => {
    const action   = mediator?.isActive ? "suspend" : "activate";
    const endpoint = `/admin/users/${id}/${action}`;
    if (!window.confirm(`${action === "suspend" ? "Suspend" : "Activate"} ${mediator?.name}?`)) return;
    setActionBusy(true);
    try {
      await api.patch(endpoint);
      await fetchDetail();
      showToast(`${mediator?.name} has been ${action === "suspend" ? "suspended" : "activated"}.`);
    } catch (e) {
      alert(e.response?.data?.message || `Failed to ${action}.`);
    } finally {
      setActionBusy(false);
    }
  };

  /* ── Assign modal callback ── */
  const handleAssigned = ({ caseId }) => {
    setShowAssignModal(false);
    showToast(`${mediator?.name} is now the lead mediator for #${caseId}.`);
    fetchDetail();
  };

  /* ── Loading / error ── */
  if (loading) return (
    <div className="amd-root">
      <AdminSidebar />
      <div className="amd-main"><div className="amd-loading">Loading mediator profile…</div></div>
    </div>
  );

  if (error || !mediator) return (
    <div className="amd-root">
      <AdminSidebar />
      <div className="amd-main">
        <div className="amd-error">
          <p>{error || "Mediator not found."}</p>
          <button onClick={() => navigate("/admin/mediators")}>Back to Mediators</button>
        </div>
      </div>
    </div>
  );

  const approval = APPROVAL_META[mediator.approvalStatus] || APPROVAL_META.pending;
  const ApprIcon = approval.icon;
  const location = [mediator.city, mediator.state].filter(Boolean).join(", ") || null;

  return (
    <div className="amd-root">
      <AdminSidebar />
      <div className="amd-main">
        <div className="amd-body">

          {/* Back button */}
          <button className="amd-back-btn" onClick={() => navigate("/admin/mediators")}>
            <FaArrowLeft /> Back to Mediators
          </button>

          {/* ── Pending approval banner ── */}
          {mediator.approvalStatus === "pending" && (
            <div className="amd-approval-banner">
              <div className="amd-banner-left">
                <FaClock className="amd-banner-icon" />
                <div>
                  <p className="amd-banner-title">Pending Approval</p>
                  <p className="amd-banner-sub">This mediator's profile is awaiting your review.</p>
                </div>
              </div>
              <div className="amd-banner-actions">
                {showRejectInput ? (
                  <div className="amd-reject-row">
                    <input
                      className="amd-reject-input"
                      placeholder="Rejection reason (required)…"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <button className="amd-btn-reject-confirm" onClick={handleReject} disabled={actionBusy}>
                      {actionBusy ? "Rejecting…" : "Confirm Reject"}
                    </button>
                    <button className="amd-btn-cancel" onClick={() => { setShowRejectInput(false); setRejectNote(""); }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="amd-btn-approve" onClick={handleApprove} disabled={actionBusy}>
                      <FaCheck /> {actionBusy ? "Approving…" : "Approve"}
                    </button>
                    <button className="amd-btn-reject" onClick={() => setShowRejectInput(true)}>
                      <FaTimes /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Profile header card ── */}
          <div className="amd-header-card">
            <div className="amd-header-left">
              {mediator.avatar
                ? <img src={mediator.avatar} alt={mediator.name} className="amd-avatar" />
                : <div className="amd-avatar amd-avatar--init">{initials(mediator.name)}</div>
              }
              <div className="amd-header-info">
                <h2 className="amd-name">{mediator.name}</h2>
                <p className="amd-mediator-id">{mediator.displayId}</p>
                {location && <p className="amd-location">{location}</p>}
                <span className="amd-approval-chip" style={{ background: approval.bg, color: approval.color }}>
                  <ApprIcon /> {approval.label}
                </span>
              </div>
            </div>
            <div className="amd-header-actions">
              <button
                className="amd-action-btn amd-action-btn--primary"
                onClick={() => setShowAssignModal(true)}
              >
                Assign Case
              </button>
              <button
                className="amd-action-btn amd-action-btn--ghost"
                disabled
                title="Messaging coming soon"
              >
                Message
              </button>
              <button
                className={`amd-action-btn ${mediator.isActive ? "amd-action-btn--danger" : "amd-action-btn--success"}`}
                onClick={handleToggleActive}
                disabled={actionBusy}
              >
                {mediator.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>

          {/* ── Metrics ── */}
          <div className="amd-metrics-row">
            <MetricCard icon={FaBriefcase}   label="Total Cases"   value={stats.totalCases}          accent="rgba(119,138,255,0.1)" />
            <MetricCard icon={FaUserTie}     label="Active Cases"  value={stats.activeCases}         accent="rgba(16,185,129,0.1)"  />
            <MetricCard icon={FaStar}        label="Success Rate"  value={`${stats.successRate}%`}   accent="rgba(251,191,36,0.12)" />
            <MetricCard icon={FaCalendarAlt} label="Member Since"  value={fmtShort(mediator.createdAt)} accent="rgba(119,138,255,0.08)" />
          </div>

          {/* ── Two-column body ── */}
          <div className="amd-two-col">

            {/* Left column */}
            <div className="amd-col-left">

              {/* Profile card */}
              <div className="amd-info-card">
                <h3 className="amd-card-title">Mediator Profile</h3>

                {/* About */}
                <div className="amd-profile-section">
                  <p className="amd-profile-label">About</p>
                  {mediator.bio?.trim()
                    ? <p className="amd-profile-text">{mediator.bio}</p>
                    : <p className="amd-profile-empty">No bio provided yet.</p>
                  }
                </div>

                {/* Qualifications */}
                <div className="amd-profile-section">
                  <p className="amd-profile-label">Qualifications</p>
                  {mediator.qualifications?.trim()
                    ? <p className="amd-profile-text">{mediator.qualifications}</p>
                    : <p className="amd-profile-empty">Not specified.</p>
                  }
                </div>

                {/* Experience */}
                <div className="amd-profile-section">
                  <p className="amd-profile-label">Experience</p>
                  {mediator.experience?.trim()
                    ? <p className="amd-profile-text">{mediator.experience}</p>
                    : <p className="amd-profile-empty">Not specified.</p>
                  }
                </div>

                {/* Languages */}
                <div className="amd-profile-section">
                  <p className="amd-profile-label">Languages</p>
                  {mediator.languages?.length > 0
                    ? (
                      <div className="amd-chip-row">
                        {mediator.languages.map((l) => <span key={l} className="amd-chip">{l}</span>)}
                      </div>
                    )
                    : <p className="amd-profile-empty">No languages listed.</p>
                  }
                </div>

                {/* Expertise Areas */}
                <div className="amd-profile-section">
                  <p className="amd-profile-label">Expertise Areas</p>
                  {mediator.expertiseAreas?.length > 0
                    ? (
                      <div className="amd-chip-row">
                        {mediator.expertiseAreas.map((e) => <span key={e} className="amd-chip amd-chip--purple">{e}</span>)}
                      </div>
                    )
                    : <p className="amd-profile-empty">No expertise areas listed.</p>
                  }
                </div>
              </div>

            </div>

            {/* Right column */}
            <div className="amd-col-right">

              {/* Contact card */}
              <div className="amd-info-card">
                <h3 className="amd-card-title">Contact Information</h3>
                <div className="amd-contact-row">
                  <FaEnvelope className="amd-contact-icon" />
                  <div>
                    <p className="amd-contact-label">Email</p>
                    <p className="amd-contact-value">{mediator.email}</p>
                  </div>
                </div>
                <div className="amd-contact-row">
                  <FaPhone className="amd-contact-icon" />
                  <div>
                    <p className="amd-contact-label">Phone</p>
                    <p className="amd-contact-value">{mediator.phone || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Verification docs card */}
              <div className="amd-info-card">
                <h3 className="amd-card-title">Verification Documents</h3>
                {!mediator.verificationDocs?.length ? (
                  <div className="amd-docs-empty">
                    <FaFileAlt className="amd-docs-empty-icon" />
                    <p>No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="amd-docs-list">
                    {mediator.verificationDocs.map((doc, i) => {
                      const ds = DOC_STATUS_META[doc.status] || DOC_STATUS_META.pending;
                      return (
                        <div key={i} className="amd-doc-row">
                          <FaFileAlt className="amd-doc-icon" />
                          <div className="amd-doc-info">
                            <p className="amd-doc-type">{doc.docType || "Document"}</p>
                            {doc.uploadedAt && (
                              <p className="amd-doc-date">Uploaded {fmtShort(doc.uploadedAt)}</p>
                            )}
                          </div>
                          <div className="amd-doc-right">
                            <span className="amd-doc-status" style={{ color: ds.color }}>{ds.label}</span>
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                className="amd-doc-view"
                              >
                                <FaEye />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Case history ── */}
          <div className="amd-case-card">
            <div className="amd-case-head">
              <h3 className="amd-card-title" style={{ margin: 0 }}>Case History</h3>
            </div>
            {cases.length === 0 ? (
              <p className="amd-case-empty">No cases assigned to this mediator yet.</p>
            ) : (
              <table className="amd-case-table">
                <thead>
                  <tr>
                    <th>CASE ID</th>
                    <th>TITLE</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const sm = CASE_STATUS_META[c.status] || { label: c.status, color: "#6b7280", bg: "#f3f4f6" };
                    return (
                      <tr key={c._id} className="amd-case-row">
                        <td className="amd-td-caseid">#{c.caseId}</td>
                        <td className="amd-td-title">{c.caseTitle}</td>
                        <td>
                          <span className="amd-status-badge" style={{ color: sm.color, background: sm.bg }}>
                            {sm.label}
                          </span>
                        </td>
                        <td className="amd-td-date">{fmtShort(c.createdAt)}</td>
                        <td>
                          <button
                            className="amd-view-btn"
                            onClick={() => navigate(`/admin/view-details/${c._id}`)}
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* ── Assign modal ── */}
      {showAssignModal && (
        <AdminAssignCaseModal
          mediatorId={mediator._id}
          mediatorName={mediator.name}
          mediatorAvatar={mediator.avatar}
          expertiseAreas={mediator.expertiseAreas || []}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleAssigned}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="amd-toast">
          <FaCheckCircle className="amd-toast-icon" />
          <p className="amd-toast-msg">{toast}</p>
          <button className="amd-toast-close" onClick={() => setToast(null)}><FaTimes /></button>
        </div>
      )}

    </div>
  );
};

export default AdminMediatorDetails;
