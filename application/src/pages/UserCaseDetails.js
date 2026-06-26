// src/pages/UserCaseDetails.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import api from "../api/axios";
import "./UserCaseDetails.css";
import {
  FaFileAlt, FaDownload, FaEye, FaVideo, FaHistory,
  FaCheckCircle, FaArrowLeft, FaUpload, FaCommentDots, FaChevronRight,
} from "react-icons/fa";

// ─── Status badge ─────────────────────────────────────────────────────────────
const getStatusStyle = (status = "") => {
  const s = status.toLowerCase().replace(/\s+/g, "-");
  switch (s) {
    case "pending":
    case "pending-review":
      return { background: "#fef3c7", color: "#92400e", label: "PENDING REVIEW" };
    case "in-review":
    case "in review":
      return { background: "#fef9e7", color: "#b45309", label: "IN REVIEW" };
    case "notice-sent":
      return { background: "#dcfce7", color: "#16a34a", label: "NOTICE SENT" };
    case "mediation":
    case "in-mediation":
    case "in-progress":
    case "assigned":
    case "arbitration":
      return { background: "#dbeafe", color: "#1d4ed8", label: "IN MEDIATION" };
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

const fmtMeetingTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm} IST`;
};

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

// ─── Fixed 5-step case progress mapping ───────────────────────────────────────
// This is a productized timeline, not a raw dump of case.timeline[]. Each step's
// "done" state is derived from real fields/events only — nothing is invented.
const selectNextMeeting = (meetings = []) => {
  const now = new Date();
  return meetings
    .filter((m) => !["cancelled", "completed"].includes((m.status || "").toLowerCase())
              && new Date(m.scheduledDate) >= now)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0] || null;
};

const selectFirstCompletedMeeting = (meetings = []) =>
  meetings
    .filter((m) => (m.status || "").toLowerCase() === "completed")
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0] || null;

const getCaseProgressSteps = (caseData, meetingsData = []) => {
  const c          = caseData || {};
  const respondent = c.respondent        || {};
  const defendant  = c.defendantDetails  || {};
  const mediator   = c.assignedNeutral   || null;
  const timeline   = c.timeline          || [];

  const findEntry = (actions) => timeline.find((t) => actions.includes(t.action)) || null;

  const nextMeeting   = selectNextMeeting(meetingsData);
  const firstSession  = selectFirstCompletedMeeting(meetingsData);
  const respondentName = defendant.fullName || respondent.name || null;
  const mediatorName    = mediator?.name || null;

  // Step 1 — the case record existing is itself the proof.
  const step1Done = true;
  const step1Date = c.createdAt || null;

  // Step 2 — only true if the invite was actually accepted.
  const acceptedEntry = findEntry(["Respondent Accepted Invite"]);
  const step2Done = respondent.inviteStatus === "accepted";
  const step2Date = acceptedEntry?.createdAt || respondent.acceptedAt || null;

  // Step 3 — only true if a neutral is actually on the case.
  const assignedEntry = findEntry(["Mediator Assigned", "Arbitrator Assigned"]);
  const step3Done = !!(mediator?.name || mediator?._id);
  const step3Date = assignedEntry?.createdAt || c.assignedAt || null;

  // Step 4 — only true if a meeting record actually carries "Completed" status.
  const step4Done = !!firstSession;
  const step4Date = firstSession?.scheduledDate || null;

  const doneFlags    = [step1Done, step2Done, step3Done, step4Done];
  const firstNotDone = doneFlags.findIndex((d) => !d);
  const stateFor = (idx, done) => (done ? "done" : idx === firstNotDone ? "current" : "pending");

  // Step 5 only lights up once everything before it is real AND a future
  // meeting actually exists — otherwise it's a quiet placeholder, not a
  // misleading "this is next" claim.
  const allPriorDone = firstNotDone === -1;
  const step5State   = allPriorDone && nextMeeting ? "current" : "pending";

  return [
    {
      key: "filed",
      title: "Case Filed",
      date: step1Date,
      description: "Initial submission of dispute details and supporting documents.",
      state: stateFor(0, step1Done),
    },
    {
      key: "accepted",
      title: "Respondent Accepted Case",
      date: step2Date,
      description: step2Done
        ? `Legal notice accepted${respondentName ? ` by ${respondentName}` : ""}.`
        : "Awaiting the respondent's acceptance of the legal notice.",
      state: stateFor(1, step2Done),
    },
    {
      key: "mediator",
      title: mediatorName ? `Mediator Assigned - ${mediatorName}` : "Mediator Assigned",
      date: step3Date,
      description: step3Done
        ? "A mediator has been assigned to guide both parties toward a resolution."
        : "Awaiting mediator assignment by the case admin.",
      state: stateFor(2, step3Done),
    },
    {
      key: "first-session",
      title: "First Mediation Session",
      date: step4Date,
      description: step4Done
        ? (firstSession?.outcome?.summary || "Joint session held to identify key issues.")
        : "No mediation session has taken place yet.",
      state: stateFor(3, step4Done),
    },
    {
      key: "next-session",
      title: nextMeeting
        ? `Upcoming: ${nextMeeting.meetingTitle || "Next Mediation Session"}`
        : "Upcoming: Next Mediation Session",
      date: nextMeeting?.scheduledDate || null,
      description: nextMeeting
        ? (nextMeeting.agenda || "Scheduled focus: next mediation session.")
        : "No further session has been scheduled yet.",
      state: step5State,
    },
  ];
};

// ─── Timeline Item ─────────────────────────────────────────────────────────────
const TimelineItem = ({ step, isLast }) => (
  <div className={`ucd-tl-item ${isLast ? "ucd-tl-item--last" : ""}`}>
    <div className="ucd-tl-left">
      <div className={`ucd-tl-dot ucd-tl-dot--${step.state}`} />
      {!isLast && <div className="ucd-tl-line" />}
    </div>
    <div className="ucd-tl-content">
      <p className={`ucd-tl-title ucd-tl-title--${step.state}`}>{step.title}</p>
      {step.date && <p className="ucd-tl-date">{fmtDate(step.date)}</p>}
      {step.description && (
        <p className={`ucd-tl-desc ucd-tl-desc--${step.state}`}>{step.description}</p>
      )}
    </div>
  </div>
);

// ─── Section Block ────────────────────────────────────────────────────────────
const SectionBlock = ({ title, children }) => (
  <div className="ucd-section-block">
    <div className="ucd-section-header">{title}</div>
    {children}
  </div>
);

// ─── Participant Row (compact, right panel) ───────────────────────────────────
const ParticipantRow = ({ name, role, avatar, isMediator }) => (
  <div className="ucd-pt-row">
    <div className={`ucd-pt-avatar${isMediator ? " ucd-pt-avatar--mediator" : ""}`}>
      {avatar
        ? <img src={avatar} alt={name || role} className="ucd-pt-img" />
        : <span>{name ? name.charAt(0).toUpperCase() : "—"}</span>
      }
    </div>
    <div className="ucd-pt-info">
      <p className="ucd-pt-name">{name || "-"}</p>
      <span className="ucd-pt-role-chip">{role}</span>
    </div>
  </div>
);

// ─── Profile Card (detailed, left panel) ─────────────────────────────────────
const ProfileCard = ({ person, role, avatar, isPlaceholder }) => (
  <div className={`ucd-profile-card${isPlaceholder ? " ucd-profile-card--placeholder" : ""}`}>
    <div className="ucd-profile-card-top">
      <div className="ucd-profile-avatar">
        {avatar
          ? <img src={avatar} alt={person?.fullName || role} className="ucd-profile-img" />
          : <span>{person?.fullName ? person.fullName.charAt(0).toUpperCase() : "—"}</span>
        }
      </div>
      <div>
        <p className="ucd-profile-name">{person?.fullName || "-"}</p>
        <span className="ucd-profile-role-chip">{role.toUpperCase()}</span>
      </div>
    </div>
    {person?.fullName && (
      <div className="ucd-profile-fields">
        {person.mobile && (
          <div className="ucd-profile-field">
            <span className="ucd-profile-field-label">PHONE NUMBER</span>
            <span className="ucd-profile-field-value">+91 {person.mobile}</span>
          </div>
        )}
        {person.email && (
          <div className="ucd-profile-field">
            <span className="ucd-profile-field-label">EMAIL ADDRESS</span>
            <span className="ucd-profile-field-value">{person.email}</span>
          </div>
        )}
        {person.address && (
          <div className="ucd-profile-field ucd-profile-field--full">
            <span className="ucd-profile-field-label">FULL ADDRESS</span>
            <span className="ucd-profile-field-value">{person.address}</span>
          </div>
        )}
        <div className="ucd-profile-field-row">
          {person.gender && (
            <div className="ucd-profile-field">
              <span className="ucd-profile-field-label">GENDER</span>
              <span className="ucd-profile-field-value">{person.gender}</span>
            </div>
          )}
          {person.dob && (
            <div className="ucd-profile-field">
              <span className="ucd-profile-field-label">DATE OF BIRTH</span>
              <span className="ucd-profile-field-value">
                {fmtDate(person.dob, { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

// ─── Doc Row (legal documents list) ──────────────────────────────────────────
const DocRow = ({ doc }) => {
  const openPresigned = async () => {
    if (!doc._id) return;
    try {
      const res = await api.get(`/documents/${doc._id}/download`);
      if (res.data?.downloadUrl) window.open(res.data.downloadUrl, "_blank");
    } catch (_) {}
  };

  const handleDownload = async () => {
    if (!doc._id) return;
    try {
      const res = await api.get(`/documents/${doc._id}/download`);
      if (res.data?.downloadUrl) {
        const a = document.createElement("a");
        a.href = res.data.downloadUrl;
        a.download = doc.name || "document";
        a.click();
      }
    } catch (_) {}
  };

  return (
    <div className="ucd-doc-row">
      <div className="ucd-doc-row-icon"><FaFileAlt /></div>
      <div className="ucd-doc-row-info">
        <p className="ucd-doc-row-name">{doc.name || "Document"}</p>
        <p className="ucd-doc-row-meta">
          {[
            doc.size,
            doc.uploadedAt && `Uploaded ${fmtDate(doc.uploadedAt)}`,
            doc.uploadedBy && `By ${doc.uploadedBy}`,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="ucd-doc-row-actions">
        <button className="ucd-doc-row-btn" onClick={openPresigned}>
          <FaEye size={10} /> View
        </button>
        <button className="ucd-doc-row-btn" onClick={handleDownload}>
          <FaDownload size={10} /> Download
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserCaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData,  setCaseData]  = useState(null);
  const [documents, setDocuments] = useState([]);
  const [meetings,  setMeetings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const fetchCaseData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const [caseRes, docsRes, meetingsRes] = await Promise.allSettled([
        api.get(`/cases/${id}`),
        api.get(`/documents/case/${id}`),
        api.get(`/meetings/case/${id}`),
      ]);

      if (caseRes.status === "fulfilled") {
        setCaseData(caseRes.value.data?.case || caseRes.value.data);
      } else {
        const err = caseRes.reason;
        if (err.response?.status === 401) { navigate("/login"); return; }
        throw err;
      }

      if (docsRes.status === "fulfilled") {
        setDocuments(docsRes.value.data?.documents || []);
      }

      if (meetingsRes.status === "fulfilled") {
        setMeetings(meetingsRes.value.data?.meetings || []);
      }
    } catch (err) {
      if (err.response?.status === 401) { navigate("/login"); return; }
      setError(err.response?.data?.message || "Failed to load case details.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchCaseData(); }, [fetchCaseData]);

  // ── Loading ──
  if (loading) return (
    <div className="ucd-root">
      <UserSidebar activePage="my-cases" />
      <main className="ucd-main">
        <div className="mc-desktop-navbar"><UserNavbar /></div>
        <div className="ucd-loader"><div className="ucd-spinner" /><p>Loading case…</p></div>
      </main>
    </div>
  );

  // ── Error ──
  if (error || !caseData) return (
    <div className="ucd-root">
      <UserSidebar activePage="my-cases" />
      <main className="ucd-main">
        <div className="mc-desktop-navbar"><UserNavbar /></div>
        <div className="ucd-loader">
          <p style={{ color: "#dc2626" }}>⚠️ {error || "Case not found."}</p>
          <button className="ucd-retry-btn" onClick={fetchCaseData}>Retry</button>
        </div>
      </main>
    </div>
  );

  // ── Field mapping ──────────────────────────────────────────────────────────
  const c = caseData;

  const petitioner       = c.petitionerDetails || {};
  const defendant        = c.defendantDetails  || {};
  const respondentInvite = c.respondent        || {};
  const mediator         = c.assignedNeutral   || null;
  const facts            = c.caseFacts         || {};

  // Raw event log (used only for the "LAST ACTIVITY" stat card sub-text below) —
  // the "Case Progression Timeline" section itself uses the fixed 5-step product
  // mapping (getCaseProgressSteps), not this raw array.
  const timeline = c.timeline || [];
  const progressSteps = getCaseProgressSteps(c, meetings);
  const nextMeeting = selectNextMeeting(meetings);

  // Documents — prefer real docs; fall back to caseFacts doc title
  const docsList = documents.length > 0
    ? documents.map(d => ({
        _id:         d._id,
        name:        d.documentTitle || d.originalFileName || "Document",
        uploadedBy:  d.uploadedBy?.name || "—",
        fileUrl:     d.fileUrl,
        size:        d.fileSize ? `${(d.fileSize / 1024).toFixed(0)} KB` : "",
        uploadedAt:  d.createdAt,
      }))
    : facts.documentTitle
    ? [{ name: facts.documentTitle, documentType: facts.documentType || "", uploadedBy: "Petitioner" }]
    : [];

  const claimDisplay = c.caseValue || "—";
  const statusMeta   = getStatusStyle(c.status || "Pending");

  // Business rules from dev comments
  const respondentAccepted = respondentInvite.inviteStatus === "accepted";
  const mediatorAssigned   = !!(mediator?.name || mediator?._id);
  const groupReady         = respondentAccepted && mediatorAssigned;

  // Session card: only shown when there IS an upcoming meeting AND respondent accepted
  const hasUpcomingSession = !!(nextMeeting) && respondentAccepted;

  // Respondent person object for profile card
  const respondentName = defendant.fullName || respondentInvite.name || null;
  const respondentPerson = respondentName
    ? {
        fullName: respondentName,
        email:    defendant.email   || respondentInvite.email  || null,
        mobile:   defendant.mobile  || respondentInvite.phone  || null,
        address:  defendant.address || null,
        gender:   defendant.gender  || null,
        dob:      defendant.dob     || null,
      }
    : null;

  // Fee values
  const mediationFee   = c.filingFee   || 0;
  const platformFee    = c.platformFee || 150;
  const taxAmount      = (mediationFee + platformFee) * 0.08;
  const totalPaidAmt   = c.filingFeePaid ? +(mediationFee + platformFee + taxAmount).toFixed(2) : 0;

  return (
    <div className="ucd-root">
      <UserSidebar activePage="my-cases" />

      <main className="ucd-main">
        <div className="mc-desktop-navbar"><UserNavbar /></div>

        {/* ── Topbar ── */}
        <header className="ucd-topbar">
          <div className="ucd-topbar-top">
            <div className="ucd-topbar-left">
              <button className="ucd-back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft size={11} />
              </button>
              <div className="ucd-breadcrumb">
                <span className="ucd-bc-cases" onClick={() => navigate("/user/my-cases")}>CASES</span>
                <FaChevronRight size={9} className="ucd-bc-arrow" />
                <span className="ucd-bc-id">#{c.caseId || "—"}</span>
              </div>
            </div>
            <div className="ucd-topbar-right">
              {/* Dev comment: Deactivate Message until admin creates group with 2 parties + mediator */}
              <button
                className={`ucd-msg-btn${!groupReady ? " ucd-btn--disabled" : ""}`}
                disabled={!groupReady}
                title={!groupReady ? "Available once admin sets up the group chat" : "Open Messages"}
              >
                <FaCommentDots size={13} /> Message
              </button>
              <button className="ucd-upload-btn" onClick={() => navigate("/user/documents", { state: { caseId: id } })}>
                <FaUpload size={13} /> Upload New Document
              </button>
            </div>
          </div>
          <div className="ucd-topbar-title-area">
            <h1 className="ucd-case-title">{c.caseTitle || "Case Details"}</h1>
            <div className="ucd-title-meta">
              <span
                className="ucd-status-inline"
                style={{ background: statusMeta.background, color: statusMeta.color }}
              >
                {statusMeta.label}
              </span>
              <span className="ucd-updated-time">
                Updated {relativeTime(c.updatedAt || c.createdAt)}
              </span>
            </div>
          </div>
        </header>

        {/* ── Stat Cards (4 cards matching design) ── */}
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
              {timeline.length > 0 ? (timeline[timeline.length - 1].action || "") : ""}
            </p>
          </div>
          <div className="ucd-stat-divider" />
          <div className="ucd-stat-card">
            <p className="ucd-stat-label">NEXT SESSION</p>
            <p className="ucd-stat-value ucd-stat-value--accent">
              {nextMeeting ? fmtDate(nextMeeting.scheduledDate) : "—"}
            </p>
            <p className="ucd-stat-sub">
              {nextMeeting?.startTime ? fmtMeetingTime(nextMeeting.startTime) : ""}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ucd-body">

          {/* ── LEFT PANEL ── */}
          <section className="ucd-left-panel">
            <div className="ucd-scroll-container">

              {/* 1. Case Progression Timeline — fixed 5-step product view */}
              <div className="ucd-section-block">
                <div className="ucd-tl-heading">
                  <FaHistory className="ucd-tl-heading-icon" />
                  <span>Case Progression Timeline</span>
                </div>
                <div className="ucd-timeline">
                  {progressSteps.map((step, i) => (
                    <TimelineItem
                      key={step.key}
                      step={step}
                      isLast={i === progressSteps.length - 1}
                    />
                  ))}
                </div>
              </div>

              {/* 2. Detailed Participant Profiles */}
              <SectionBlock title="Detailed Participant Profiles">
                <div className="ucd-profile-grid">
                  <ProfileCard person={petitioner} role="Petitioner" />
                  <ProfileCard
                    person={respondentPerson}
                    role="Respondent"
                    isPlaceholder={!respondentPerson}
                  />
                </div>
              </SectionBlock>

              {/* 3. Case Summary */}
              {(facts.caseSummary || facts.place || facts.date) && (
                <SectionBlock title="Case Summary">
                  {facts.caseSummary && (
                    <p className="ucd-description-text" style={{ marginBottom: 16 }}>
                      {facts.caseSummary}
                    </p>
                  )}
                  {(facts.place || facts.date) && (
                    <div className="ucd-case-meta-grid">
                      {facts.place && (
                        <div className="ucd-case-meta-item">
                          <span className="ucd-info-label">LOCATION OF INCIDENT</span>
                          <span className="ucd-info-value">{facts.place}</span>
                        </div>
                      )}
                      {facts.date && (
                        <div className="ucd-case-meta-item">
                          <span className="ucd-info-label">APPROXIMATE DATE</span>
                          <span className="ucd-info-value">{fmtDate(facts.date)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </SectionBlock>
              )}

              {/* 4. Legal Documents */}
              <SectionBlock title="Legal Documents">
                {docsList.length === 0 ? (
                  <p className="ucd-description-text">No documents uploaded yet.</p>
                ) : (
                  <div className="ucd-doc-list">
                    {docsList.map((doc, i) => <DocRow key={doc._id || i} doc={doc} />)}
                  </div>
                )}
              </SectionBlock>

            </div>
          </section>

          {/* ── RIGHT PANEL ── */}
          <aside className="ucd-right-panel">

            {/* Case Participants — compact list matching design */}
            <div className="ucd-participants-card">
              <div className="ucd-participants-title">CASE PARTICIPANTS</div>
              <ParticipantRow
                name={petitioner.fullName || null}
                role="Petitioner"
                avatar={null}
              />
              <ParticipantRow
                name={respondentName}
                role="Respondent"
                avatar={null}
              />
              <ParticipantRow
                name={mediator?.name || null}
                role="Mediator"
                avatar={mediator?.avatar || null}
                isMediator
              />
            </div>

            {/* Session card — dev comment: hide when no upcoming meeting OR respondent not accepted */}
            {hasUpcomingSession && (
              <div className="ucd-session-card">
                <div className="ucd-session-top">
                  <span className="ucd-session-badge">SCHEDULED</span>
                  <FaVideo className="ucd-session-icon" />
                </div>
                <p className="ucd-session-label">Next Video Session</p>
                <p className="ucd-session-datetime">
                  {fmtDate(nextMeeting.scheduledDate)},{" "}
                  {nextMeeting.startTime ? fmtMeetingTime(nextMeeting.startTime) : ""}
                </p>
                {nextMeeting.agenda && (
                  <p className="ucd-session-focus">{nextMeeting.agenda}</p>
                )}
                <button
                  className="ucd-join-btn"
                  onClick={() => navigate(`/user/meetings/lobby/${nextMeeting._id}`)}
                >
                  <FaVideo size={12} /> Join Meeting
                </button>
              </div>
            )}

            {/* Fee Summary */}
            <div className="ucd-fee-card">
              <div className="ucd-fee-title">FEE SUMMARY</div>
              <div className="ucd-fee-rows">
                <div className="ucd-fee-row">
                  <span>Mediation Fee</span>
                  <span>{mediationFee > 0 ? `₹${Number(mediationFee).toLocaleString("en-IN")}` : "—"}</span>
                </div>
                <div className="ucd-fee-row">
                  <span>Filing Platform Fee</span>
                  <span>₹{Number(platformFee).toLocaleString("en-IN")}</span>
                </div>
                <div className="ucd-fee-row">
                  <span>Estimated Taxes (8%)</span>
                  <span>{taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : "—"}</span>
                </div>
                <div className="ucd-fee-divider" />
                <div className="ucd-fee-row ucd-fee-row--total">
                  <span>Total Paid</span>
                  <span>{totalPaidAmt > 0 ? `₹${totalPaidAmt.toLocaleString("en-IN")}` : "—"}</span>
                </div>
                <div className="ucd-fee-row">
                  <span>Pending Balance</span>
                  <span className={c.filingFeePaid ? "ucd-fee-zero" : "ucd-fee-due"}>
                    {c.filingFeePaid ? "₹0.00" : "—"}
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

      </main>
    </div>
  );
};

export default UserCaseDetails;
