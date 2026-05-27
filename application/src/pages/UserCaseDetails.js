// src/pages/UserCaseDetails.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import api from "../api/axios";
import "./UserCaseDetails.css";
import {
  FaFileAlt, FaDownload, FaEye, FaVideo,
  FaCheckCircle, FaEnvelope, FaPhone,
  FaArrowLeft, FaUpload, FaCommentDots, FaChevronRight,
} from "react-icons/fa";

// ─── Status badge ─────────────────────────────────────────────────────────────
const getStatusStyle = (status = "") => {
  const s = status.toLowerCase().replace(/\s+/g, "-");
  switch (s) {
    case "pending":
    case "pending-review":
      return { background: "#fef3c7", color: "#92400e", label: "PENDING" };
    case "mediation":
    case "in-mediation":
      return { background: "#dbeafe", color: "#1d4ed8", label: "IN MEDIATION" };
    case "active":
    case "in-progress":
    case "notice-sent":
      return { background: "#dcfce7", color: "#16a34a", label: "IN PROGRESS" };
    case "resolved":
    case "awarded":
      return { background: "#dcfce7", color: "#16a34a", label: "RESOLVED" };
    case "rejected":
      return { background: "#fee2e2", color: "#dc2626", label: "REJECTED" };
    case "closed":
    case "withdrawn":
      return { background: "#f3f4f6", color: "#6b7280", label: status.toUpperCase() };
    default:
      return { background: "#f3f4f6", color: "#6b7280", label: status.toUpperCase() };
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d, opts) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", opts || { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const relativeTime = (dateStr) => {
  if (!dateStr) return "—";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24)  return `${hours} hr${hours !== 1 ? "s" : ""} ago`;
  if (days  === 1) return "Yesterday";
  if (days  < 7)   return `${days} days ago`;
  return fmtDate(dateStr);
};

// ─── Timeline Item ─────────────────────────────────────────────────────────────
// Backend timeline shape: { action, note, performedBy: { name, role }, createdAt, isSystem }
const TimelineItem = ({ item, isLast }) => {
  const isUpcoming = item.upcoming === true; // only for client-side injected items
  return (
    <div className={`ucd-tl-item ${isLast ? "ucd-tl-item--last" : ""}`}>
      <div className="ucd-tl-left">
        <div className={`ucd-tl-dot ${item.done !== false ? "ucd-tl-dot--done" : ""} ${isUpcoming ? "ucd-tl-dot--upcoming" : ""}`} />
        {!isLast && <div className="ucd-tl-line" />}
      </div>
      <div className="ucd-tl-content">
        <p className={`ucd-tl-title ${isUpcoming ? "ucd-tl-title--upcoming" : ""}`}>
          {item.action || item.title || "—"}
        </p>
        <p className="ucd-tl-date">
          {fmtDate(item.createdAt || item.date)}
          {item.performedBy?.name ? ` · ${item.performedBy.name}` : ""}
        </p>
        <p className={`ucd-tl-desc ${isUpcoming ? "ucd-tl-desc--italic" : ""}`}>
          {item.note || item.desc || ""}
        </p>
      </div>
    </div>
  );
};

// ─── Info Grid ────────────────────────────────────────────────────────────────
const InfoGrid = ({ items }) => (
  <div className="ucd-info-grid">
    {items.map(({ label, value }) => (
      <div key={label} className="ucd-info-item">
        <div className="ucd-info-label">{label}</div>
        <div className="ucd-info-value">{value || "—"}</div>
      </div>
    ))}
  </div>
);

// ─── Section Block ────────────────────────────────────────────────────────────
const SectionBlock = ({ title, children }) => (
  <div className="ucd-section-block">
    <div className="ucd-section-header">{title}</div>
    {children}
  </div>
);

// ─── Doc Preview ──────────────────────────────────────────────────────────────
const DocPreview = ({ doc }) => (
  <div className="ucd-doc-preview">
    <div className="ucd-doc-preview-icon"><FaFileAlt /></div>
    <div className="ucd-doc-preview-name">{doc?.name || doc?.documentTitle || "No document"}</div>
    {doc && (
      <>
        <div className="ucd-doc-preview-meta">
          {doc.size ? `${doc.size} · ` : ""}
          {doc.uploadedBy || doc.documentType || ""}
        </div>
        <div className="ucd-doc-preview-actions">
          <button className="ucd-doc-act-btn"><FaEye size={11} /> View</button>
          <button className="ucd-doc-act-btn"><FaDownload size={11} /> Download</button>
        </div>
      </>
    )}
  </div>
);

// ─── Party Card ───────────────────────────────────────────────────────────────
const PartyCard = ({ person, role, caseId, caseType }) => {
  const hasData = !!(person?.fullName);
  return (
    <div className="ucd-party-card">
      <div className="ucd-party-card-top">
        <span className="ucd-party-caseid">Case ID: #{caseId || "—"}</span>
        <span className="ucd-party-role-chip">{role}</span>
      </div>
      <div className="ucd-party-body">
        <div className="ucd-party-avatar">
          {hasData ? person.fullName.charAt(0).toUpperCase() : "-"}
        </div>
        <div className="ucd-party-info">
          {/* Dev comment (Vamshi): show "-" when not assigned */}
          <h4>{hasData ? person.fullName : "-"}</h4>
          <div className="ucd-party-muted">
            {/* backend uses mobile, not phone */}
            {hasData ? (person.email || "-") : "-"}
          </div>
          <div className="ucd-party-muted">
            {hasData ? (person.mobile || person.phone || "-") : "-"}
          </div>
        </div>
      </div>
      <div className="ucd-party-footer">{caseType || "—"}</div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserCaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchCase = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      // GET /cases/:id → { success: true, case: { ...caseFields } }
      const res = await api.get(`/cases/${id}`);
      const data = res.data?.case || res.data;
      setCaseData(data);
    } catch (err) {
      if (err.response?.status === 401) { navigate("/login"); return; }
      setError(err.response?.data?.message || "Failed to load case details.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  // ── Loading ──
  if (loading) return (
    <div className="ucd-root">
      <UserSidebar activePage="my-cases" />
      <main className="ucd-main">
        <div className="ucd-loader"><div className="ucd-spinner" /><p>Loading case…</p></div>
      </main>
    </div>
  );

  // ── Error ──
  if (error || !caseData) return (
    <div className="ucd-root">
      <UserSidebar activePage="my-cases" />
      <main className="ucd-main">
        <div className="ucd-loader">
          <p style={{ color: "#dc2626" }}>⚠️ {error || "Case not found."}</p>
          <button className="ucd-retry-btn" onClick={fetchCase}>Retry</button>
        </div>
      </main>
    </div>
  );

  // ── Field mapping from real API response ──────────────────────────────────
  const c = caseData;

  // Petitioner: stored in petitionerDetails (fullName, mobile, email, address, gender, dob)
  const petitioner = c.petitionerDetails || {};

  // Respondent personal details: stored in defendantDetails
  // Respondent invite/status: stored in c.respondent { userId, email, inviteStatus, name }
  const defendant  = c.defendantDetails  || {};
  const respondentInvite = c.respondent  || {};

  // Mediator: stored in assignedNeutral (populated: { name, email, avatar, role })
  const mediator   = c.assignedNeutral   || null;

  // Case facts: stored in caseFacts { caseSummary, place, date, documentTitle, documentType }
  const facts      = c.caseFacts         || {};

  // Timeline: array of { action, note, performedBy: { name, role }, createdAt }
  const timeline   = (c.timeline || []).slice().reverse(); // newest last for display

  // Documents: from caseFacts document fields (no dedicated docs array in this model)
  // If your model stores docs elsewhere, adjust here
  const docsList = [];
  if (facts.documentTitle) {
    docsList.push({
      name: facts.documentTitle,
      documentType: facts.documentType || "",
      uploadedBy: "Petitioner",
    });
  }

  // Claim amount: stored as caseValue (string like "₹5,50,000" or plain number)
  const claimDisplay = c.caseValue || "—";

  // Next session: from c.nextSession (if your backend sets it) or null
  const nextSession = c.nextSession || null;

  // Status badge
  const statusMeta = getStatusStyle(c.status || "Pending");

  // Dev comment (Vamshi, 23 Apr 2026):
  // Message deactivated until admin creates group with 2 parties + mediator
  const respondentAccepted = respondentInvite.inviteStatus === "accepted";
  const mediatorAssigned   = !!(mediator?.name || mediator?._id);
  const groupReady         = respondentAccepted && mediatorAssigned && !!(c.groupId);

  // Dev comment (Vamshi, 23 Apr 2026):
  // Hide session card when no upcoming meeting OR respondent not accepted
  const hasUpcomingSession = !!(nextSession) && respondentAccepted;

  // Fee data (will be real once payment is re-enabled on backend)
  const fees = c.fees || {
    mediationFee:      c.filingFee       || 0,
    filingPlatformFee: c.platformFee     || 0,
    taxRate:           0.08,
    totalPaid:         c.totalPaid       || 0,
    pendingBalance:    c.pendingBalance  ?? 0,
  };
  const taxAmount = ((fees.mediationFee || 0) + (fees.filingPlatformFee || 0)) * (fees.taxRate || 0.08);

  return (
    <div className="ucd-root">
      <UserSidebar activePage="my-cases" />

      <main className="ucd-main">
        <div className="mc-desktop-navbar"><UserNavbar /></div>

        {/* ── Topbar ── */}
        <header className="ucd-topbar">
          <div className="ucd-topbar-left">
            <button className="ucd-back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft size={11} />
            </button>
            <div className="ucd-breadcrumb">
              <span className="ucd-bc-cases" onClick={() => navigate("/user/my-cases")}>CASES</span>
              <FaChevronRight size={9} className="ucd-bc-arrow" />
              <span className="ucd-bc-id">#{c.caseId || "—"}</span>
            </div>
            <h3 className="ucd-topbar-title">Case Details</h3>
          </div>
          <div className="ucd-topbar-right">
            {/* Dev comment (Vamshi): Deactivate until admin creates group with 2 parties + mediator */}
            <button
              className={`ucd-msg-btn${!groupReady ? " ucd-btn--disabled" : ""}`}
              disabled={!groupReady}
              title={!groupReady ? "Available once admin sets up the group chat" : "Open Messages"}
            >
              <FaCommentDots size={13} /> Message
            </button>
            <button className="ucd-upload-btn">
              <FaUpload size={13} /> Upload New Document
            </button>
          </div>
        </header>

        {/* ── Stat Cards ── */}
        <div className="ucd-stats-bar">
          <div className="ucd-stat-card">
            <p className="ucd-stat-label">TOTAL CLAIM AMOUNT</p>
            <p className="ucd-stat-value">{claimDisplay}</p>
          </div>
          <div className="ucd-stat-divider" />
          <div className="ucd-stat-card">
            <p className="ucd-stat-label">FILED DATE</p>
            <p className="ucd-stat-value">{fmtDate(c.createdAt)}</p>
            <p className="ucd-stat-sub">
              {c.createdAt
                ? `${Math.floor((Date.now() - new Date(c.createdAt)) / 86400000)} days ago`
                : ""}
            </p>
          </div>
          <div className="ucd-stat-divider" />
          <div className="ucd-stat-card">
            <p className="ucd-stat-label">LAST ACTIVITY</p>
            <p className="ucd-stat-value">{relativeTime(c.updatedAt || c.createdAt)}</p>
            <p className="ucd-stat-sub">
              {/* Show the latest timeline action as the activity note */}
              {timeline.length > 0 ? (timeline[timeline.length - 1].action || "") : ""}
            </p>
          </div>
          <div className="ucd-stat-divider" />
          <div className="ucd-stat-card">
            <p className="ucd-stat-label">NEXT SESSION</p>
            <p className="ucd-stat-value ucd-stat-value--accent">
              {nextSession ? fmtDate(nextSession) : "—"}
            </p>
            <p className="ucd-stat-sub">
              {nextSession
                ? new Date(nextSession).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST"
                : ""}
            </p>
          </div>
          <div className="ucd-stat-divider" />
          <div className="ucd-stat-card">
            <p className="ucd-stat-label">STATUS</p>
            <span
              className="ucd-status-badge"
              style={{ background: statusMeta.background, color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ucd-body">

          {/* ── LEFT PANEL ── */}
          <section className="ucd-left-panel">
            <div className="ucd-scroll-container">

              {/* Case Details — real fields from caseModel */}
              <SectionBlock title="Case Details">
                <InfoGrid items={[
                  { label: "Case ID",          value: c.caseId },
                  { label: "Case Title",        value: c.caseTitle },
                  { label: "Case Type",         value: c.caseType },
                  { label: "Cause of Action",   value: c.causeOfAction },
                  { label: "Relief Sought",     value: c.reliefSought },
                  { label: "Case Value",        value: c.caseValue },
                  { label: "Filed Date",        value: fmtDate(c.createdAt) },
                  { label: "Location",          value: facts.place },
                  { label: "Incident Date",     value: fmtDate(facts.date) },
                ]} />
                {facts.caseSummary && (
                  <div className="ucd-description-box">
                    <div className="ucd-info-label">Case Summary</div>
                    <p className="ucd-description-text">{facts.caseSummary}</p>
                  </div>
                )}
              </SectionBlock>

              {/* Petitioner Details — real fields: fullName, mobile, email, address, gender, dob */}
              <SectionBlock title="Petitioner Details">
                <InfoGrid items={[
                  { label: "Full Name",     value: petitioner.fullName },
                  { label: "Father/Spouse", value: petitioner.fatherName },
                  { label: "Gender",        value: petitioner.gender },
                  { label: "Date of Birth", value: fmtDate(petitioner.dob, { day: "2-digit", month: "long", year: "numeric" }) },
                  { label: "Mobile",        value: petitioner.mobile },
                  { label: "Email",         value: petitioner.email },
                  { label: "Address",       value: petitioner.address },
                  { label: "ID Type",       value: petitioner.idType },
                ]} />
              </SectionBlock>

              {/* Respondent Details — real fields from defendantDetails + respondent invite */}
              <SectionBlock title="Respondent Details">
                <InfoGrid items={[
                  { label: "Full Name",       value: defendant.fullName     || respondentInvite.name  || "-" },
                  { label: "Father/Spouse",   value: defendant.fatherName   || "-" },
                  { label: "Gender",          value: defendant.gender       || "-" },
                  { label: "Date of Birth",   value: defendant.dob ? fmtDate(defendant.dob, { day: "2-digit", month: "long", year: "numeric" }) : "-" },
                  { label: "Mobile",          value: defendant.mobile       || respondentInvite.phone || "-" },
                  { label: "Email",           value: defendant.email        || respondentInvite.email || "-" },
                  { label: "Invite Status",   value: respondentInvite.inviteStatus || "-" },
                ]} />
              </SectionBlock>

              {/* Mediator Details */}
              {mediatorAssigned && (
                <SectionBlock title="Assigned Mediator">
                  <InfoGrid items={[
                    { label: "Name",  value: mediator?.name  || "-" },
                    { label: "Email", value: mediator?.email || "-" },
                    { label: "Role",  value: mediator?.role  || "Mediator" },
                  ]} />
                </SectionBlock>
              )}

              {/* Timeline — real shape: { action, note, performedBy: { name, role }, createdAt } */}
              <SectionBlock title="Case Progression Timeline">
                {timeline.length === 0 ? (
                  <p className="ucd-description-text">No timeline events yet.</p>
                ) : (
                  <div className="ucd-timeline">
                    {timeline.map((item, i) => (
                      <TimelineItem
                        key={item._id || i}
                        item={item}
                        isLast={i === timeline.length - 1}
                      />
                    ))}
                  </div>
                )}
              </SectionBlock>

            </div>
          </section>

          {/* ── RIGHT PANEL ── */}
          <aside className="ucd-right-panel">

            {/* Petitioner Party Card */}
            <PartyCard
              person={petitioner}
              role="Petitioner"
              caseId={c.caseId}
              caseType={c.caseType}
            />

            {/* Respondent Party Card */}
            <PartyCard
              person={
                defendant.fullName
                  ? defendant
                  : { fullName: respondentInvite.name, email: respondentInvite.email, mobile: respondentInvite.phone }
              }
              role="Respondent"
              caseId={c.caseId}
              caseType={c.caseType}
            />

            {/* Mediator Card */}
            <div className="ucd-party-card ucd-mediator-card">
              <div className="ucd-party-card-top">
                <span className="ucd-party-caseid">Assigned Mediator</span>
                <span className="ucd-party-role-chip ucd-role-chip--mediator">Mediator</span>
              </div>
              <div className="ucd-party-body">
                <div className="ucd-party-avatar ucd-avatar--mediator">
                  {/* Dev comment (Vamshi): show "-" when mediator not assigned */}
                  {mediator?.name ? mediator.name.charAt(0).toUpperCase() : "-"}
                </div>
                <div className="ucd-party-info">
                  <h4>{mediator?.name || "-"}</h4>
                  <div className="ucd-party-muted">{mediator?.email || "-"}</div>
                  <div className="ucd-party-muted">{mediator?.role  || "-"}</div>
                </div>
              </div>
            </div>

            {/* Dev comment (Vamshi, 23 Apr 2026):
                Remove session card when no upcoming meeting OR respondent not accepted */}
            {hasUpcomingSession && (
              <div className="ucd-session-card">
                <div className="ucd-session-top">
                  <span className="ucd-session-badge">SCHEDULED</span>
                  <FaVideo className="ucd-session-icon" />
                </div>
                <p className="ucd-session-label">Next Video Session</p>
                <p className="ucd-session-datetime">
                  {fmtDate(nextSession)},{" "}
                  {new Date(nextSession).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST
                </p>
                <p className="ucd-session-focus">
                  {c.sessionFocus || "Focus: Resolution terms and next steps."}
                </p>
                <button className="ucd-join-btn"><FaVideo size={12} /> Join Meeting</button>
              </div>
            )}

            {/* Fee Summary — will show real data once payment is re-enabled */}
            <div className="ucd-fee-card">
              <div className="ucd-fee-title">FEE SUMMARY</div>
              <div className="ucd-fee-rows">
                <div className="ucd-fee-row">
                  <span>Filing Fee</span>
                  <span>{c.filingFee ? `₹${Number(c.filingFee).toLocaleString("en-IN")}` : "—"}</span>
                </div>
                <div className="ucd-fee-row">
                  <span>Platform Fee</span>
                  <span>{fees.filingPlatformFee ? `₹${Number(fees.filingPlatformFee).toLocaleString("en-IN")}` : "—"}</span>
                </div>
                <div className="ucd-fee-row">
                  <span>Estimated Taxes (8%)</span>
                  <span>{taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : "—"}</span>
                </div>
                <div className="ucd-fee-divider" />
                <div className="ucd-fee-row ucd-fee-row--total">
                  <span>Total Paid</span>
                  <span>
                    {c.filingFeePaid
                      ? `₹${Number(c.filingFee || 0).toLocaleString("en-IN")}`
                      : "—"}
                  </span>
                </div>
                <div className="ucd-fee-row">
                  <span>Payment Status</span>
                  <span className={c.filingFeePaid ? "ucd-fee-zero" : "ucd-fee-due"}>
                    {c.filingFeePaid ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
              {c.filingFeePaid && (
                <div className="ucd-dues-cleared">
                  <FaCheckCircle className="ucd-dues-icon" /> ALL DUES CLEARED
                </div>
              )}
            </div>

          </aside>
        </div>

        {/* ── Documents Section ── */}
        <section className="ucd-documents-section">
          <h4 className="ucd-documents-title">Documents &amp; ID Proofs</h4>
          <div className="ucd-documents-row">
            {docsList.length > 0
              ? docsList.map((doc, i) => <DocPreview key={i} doc={doc} />)
              : [0, 1, 2, 3].map(i => <DocPreview key={i} doc={null} />)
            }
          </div>
        </section>

      </main>
    </div>
  );
};

export default UserCaseDetails;