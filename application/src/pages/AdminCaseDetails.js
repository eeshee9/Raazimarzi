// src/pages/AdminCaseDetails.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaBell, FaChevronRight, FaVideo,
  FaFileAlt, FaImage, FaFilePdf, FaDownload, FaEye,
  FaCheckCircle, FaClock, FaFileUpload, FaUserPlus, FaSync,
  FaStickyNote,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import ScheduleMeetingModal   from "../components/ScheduleMeetingModal";
import AssignMediatorModal    from "../components/AssignMediatorModal";
import RequestDocumentModal   from "../components/RequestDocumentModal";
import "./AdminCaseDetails.css";

/* ── helpers ── */
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const fmtRelative = d => {
  if (!d) return "—";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const fmtINR = n =>
  n !== undefined && n !== null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const getStatusClass = (s = "") => {
  const v = s.toLowerCase();
  if (["resolved","awarded"].includes(v))           return "acd-status-badge--resolved";
  if (["mediation","in-progress","hearing"].includes(v)) return "acd-status-badge--mediation";
  if (["pending","pending-review","notice-sent","in review"].includes(v)) return "acd-status-badge--pending";
  if (["rejected","withdrawn","closed"].includes(v)) return "acd-status-badge--rejected";
  return "acd-status-badge--mediation";
};

const guessDocType = (fileType = "", title = "") => {
  const t = (fileType + title).toLowerCase();
  if (t.includes("pdf"))                    return "pdf";
  if (t.includes("jpg") || t.includes("jpeg") || t.includes("png") || t.includes("image")) return "image";
  return "file";
};

const DocIcon = ({ type }) => {
  if (type === "image") return <FaImage className="acd-doc__icon acd-doc__icon--img" />;
  if (type === "pdf")   return <FaFilePdf className="acd-doc__icon acd-doc__icon--pdf" />;
  return <FaFileAlt className="acd-doc__icon" />;
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
const AdminCaseDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [caseData,          setCaseData]         = useState(null);
  const [meetings,          setMeetings]          = useState([]);
  const [caseNotes,         setCaseNotes]         = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [fetchError,        setFetchError]        = useState("");
  const [adminName,         setAdminName]         = useState("Admin");
  const [adminAvatar,       setAdminAvatar]       = useState("");
  const [showSchedule,      setShowSchedule]      = useState(false);
  const [showAssignMediator,setShowAssignMediator] = useState(false);
  const [showRequestDoc,    setShowRequestDoc]    = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [caseRes, meetingsRes] = await Promise.allSettled([
        api.get(`/admin/cases/${id}`),
        api.get(`/meetings/case/${id}`),
      ]);
      if (caseRes.status === "fulfilled") {
        setCaseData(caseRes.value.data.case || caseRes.value.data);
        setCaseNotes(caseRes.value.data.caseNotes || []);
      } else {
        setFetchError("Could not load case details. Check your connection and try again.");
      }
      if (meetingsRes.status === "fulfilled") {
        setMeetings(meetingsRes.value.data.meetings || meetingsRes.value.data || []);
      }
    } catch (err) {
      console.error("AdminCaseDetails fetch error:", err);
      setFetchError("Could not load case details. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setAdminName(localStorage.getItem("name") || "Admin");
    setAdminAvatar(localStorage.getItem("avatar") || "");
    fetchAll();
  }, [navigate, fetchAll]);

  const handleMediatorAssigned = (mediator) => {
    setCaseData(prev => prev ? { ...prev, assignedNeutral: mediator } : prev);
  };

  if (loading) return (
    <div className="acd-root">
      <AdminSidebar />
      <div className="acd-loading">Loading case details…</div>
    </div>
  );

  if (fetchError || !caseData) return (
    <div className="acd-root">
      <AdminSidebar />
      <div className="acd-error-state">
        <p className="acd-error-state__msg">{fetchError || "Case not found."}</p>
        <button className="acd-error-state__retry" onClick={fetchAll}>
          <FaSync style={{ marginRight: 8 }} /> Retry
        </button>
      </div>
    </div>
  );

  /* ── Derived values from real data ── */
  const petitioner = caseData.petitionerDetails || {};
  const defendant  = caseData.defendantDetails  || {};
  const respondent = caseData.respondent        || {};
  const neutral    = caseData.assignedNeutral;
  const timeline   = caseData.timeline          || [];
  const documents  = caseData.documents         || [];
  const facts      = caseData.caseFacts         || {};

  const petitionerName = petitioner.fullName || caseData.claimant?.name || "Petitioner";
  const respondentName = defendant.fullName  || respondent.name          || "Respondent";

  const lastTimelineEntry = timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const lastActivity      = lastTimelineEntry ? fmtRelative(lastTimelineEntry.createdAt) : "—";
  const lastActivityNote  = lastTimelineEntry?.action || "";

  /* Bug 2 fix: real meeting model field is scheduledDate */
  const upcomingMeeting = meetings
    .filter(m => m.status !== "completed" && new Date(m.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

  const nextSessionLabel = upcomingMeeting
    ? new Date(upcomingMeeting.scheduledDate).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const hasMediator = !!neutral;

  const avatarSrc = adminAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  return (
    <div className="acd-root">
      <AdminSidebar />

      <main className="acd-main">

        {/* ── Topbar ── */}
        <header className="acd-topbar">
          <div className="acd-topbar__right">
            <button className="acd-topbar__bell"><FaBell /></button>
            <img src={avatarSrc} alt={adminName} className="acd-topbar__avatar" />
          </div>
        </header>

        <div className="acd-body">

          {/* ── Breadcrumb ── */}
          <div className="acd-breadcrumb">
            <span className="acd-breadcrumb__link" onClick={() => navigate("/admin/new-cases")}>
              CASES
            </span>
            <FaChevronRight className="acd-breadcrumb__sep" />
            <span className="acd-breadcrumb__current">{caseData.caseId}</span>
          </div>

          {/* ── Hero ── */}
          <div className="acd-hero">
            <div className="acd-hero__left">
              <h1 className="acd-hero__title">{caseData.caseTitle}</h1>
              <div className="acd-hero__meta">
                <span className={`acd-status-badge ${getStatusClass(caseData.status)}`}>
                  {caseData.status}
                </span>
                <span className="acd-hero__updated">Updated {lastActivity}</span>
              </div>
            </div>
            <div className="acd-hero__actions">
              <button
                className="acd-action-btn acd-action-btn--outline"
                onClick={() => setShowSchedule(true)}
              >
                <FaVideo style={{ fontSize: 13 }} />
                Schedule Meeting
              </button>
              <button
                className="acd-action-btn acd-action-btn--outline"
                onClick={() => setShowRequestDoc(true)}
              >
                <FaFileUpload style={{ fontSize: 13 }} />
                Request New Document
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="acd-stats">
            <div className="acd-stat">
              <span className="acd-stat__label">CLAIM AMOUNT</span>
              <span className="acd-stat__value">{caseData.caseValue || "—"}</span>
            </div>
            <div className="acd-stat">
              <span className="acd-stat__label">FILED DATE</span>
              <span className="acd-stat__value">{fmtDate(caseData.createdAt)}</span>
            </div>
            <div className="acd-stat">
              <span className="acd-stat__label">LAST ACTIVITY</span>
              <span className="acd-stat__value acd-stat__value--lg">{lastActivity}</span>
              <span className="acd-stat__sub">{lastActivityNote}</span>
            </div>
            <div className="acd-stat">
              <span className="acd-stat__label">NEXT SESSION</span>
              <span className="acd-stat__value acd-stat__value--accent">{nextSessionLabel}</span>
            </div>
          </div>

          {/* ── Two-col layout ── */}
          <div className="acd-layout">

            {/* LEFT COLUMN */}
            <div className="acd-col-left">

              {/* Timeline */}
              <div className="acd-card">
                <div className="acd-card__header">
                  <FaClock className="acd-card__header-icon" />
                  <h3 className="acd-card__title">Case Progression Timeline</h3>
                </div>
                <div className="acd-timeline">
                  {timeline.length === 0 && (
                    <p className="acd-empty-msg">No timeline entries yet.</p>
                  )}
                  {timeline.map((step, idx) => (
                    <div key={step._id || idx} className="acd-timeline__item">
                      <div className="acd-timeline__dot-col">
                        <div className="acd-timeline__dot acd-timeline__dot--done" />
                        {idx < timeline.length - 1 && <div className="acd-timeline__line" />}
                      </div>
                      <div className="acd-timeline__content">
                        <div className="acd-timeline__title">{step.action}</div>
                        <div className="acd-timeline__date">{fmtDate(step.createdAt)}</div>
                        {step.note && <div className="acd-timeline__desc">{step.note}</div>}
                        {step.performedBy?.name && (
                          <div className="acd-timeline__by">By {step.performedBy.name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Participant Profiles */}
              <div className="acd-card">
                <h3 className="acd-card__title" style={{ marginBottom: 20 }}>Detailed Participant Profiles</h3>
                <div className="acd-participants">

                  {/* Petitioner */}
                  <div className="acd-participant">
                    <div className="acd-participant__header">
                      <div className="acd-participant__avatar acd-participant__avatar--placeholder">
                        <span>{petitionerName[0]}</span>
                      </div>
                      <div>
                        <div className="acd-participant__name">{petitionerName}</div>
                        <div className="acd-participant__role">PETITIONER</div>
                      </div>
                    </div>
                    <div className="acd-participant__fields">
                      <div className="acd-field">
                        <span className="acd-field__label">PHONE NUMBER</span>
                        <span className="acd-field__value">{petitioner.mobile || caseData.claimant?.phone || "—"}</span>
                      </div>
                      <div className="acd-field">
                        <span className="acd-field__label">EMAIL ADDRESS</span>
                        <span className="acd-field__value">{petitioner.email || caseData.claimant?.email || "—"}</span>
                      </div>
                      <div className="acd-field acd-field--full">
                        <span className="acd-field__label">FULL ADDRESS</span>
                        <span className="acd-field__value">{petitioner.address || "—"}</span>
                      </div>
                      <div className="acd-field">
                        <span className="acd-field__label">GENDER</span>
                        <span className="acd-field__value">{petitioner.gender || "—"}</span>
                      </div>
                      <div className="acd-field">
                        <span className="acd-field__label">DATE OF BIRTH</span>
                        <span className="acd-field__value">{petitioner.dob || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Respondent */}
                  <div className="acd-participant">
                    <div className="acd-participant__header">
                      <div className="acd-participant__avatar acd-participant__avatar--placeholder">
                        <span>{respondentName[0]}</span>
                      </div>
                      <div>
                        <div className="acd-participant__name">{respondentName}</div>
                        <div className="acd-participant__role">RESPONDENT</div>
                      </div>
                    </div>
                    <div className="acd-participant__fields">
                      <div className="acd-field">
                        <span className="acd-field__label">PHONE NUMBER</span>
                        <span className="acd-field__value">
                          {defendant.mobile || respondent.phone || caseData.respondent?.userId?.phone || "—"}
                        </span>
                      </div>
                      <div className="acd-field">
                        <span className="acd-field__label">EMAIL ADDRESS</span>
                        <span className="acd-field__value">
                          {defendant.email || respondent.email || "—"}
                        </span>
                      </div>
                      <div className="acd-field acd-field--full">
                        <span className="acd-field__label">FULL ADDRESS</span>
                        <span className="acd-field__value">—</span>
                      </div>
                      <div className="acd-field">
                        <span className="acd-field__label">GENDER</span>
                        <span className="acd-field__value">{defendant.gender || "—"}</span>
                      </div>
                      <div className="acd-field">
                        <span className="acd-field__label">DATE OF BIRTH</span>
                        <span className="acd-field__value">{defendant.dob || "—"}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Case Summary */}
              <div className="acd-card">
                <h3 className="acd-card__title" style={{ marginBottom: 14 }}>Case Summary</h3>
                <p className="acd-summary__text">{facts.caseSummary || caseData.causeOfAction || "No summary available."}</p>
                <div className="acd-summary__meta">
                  <div className="acd-field">
                    <span className="acd-field__label">LOCATION OF INCIDENT</span>
                    <span className="acd-field__value">{facts.place || "—"}</span>
                  </div>
                  <div className="acd-field">
                    <span className="acd-field__label">APPROXIMATE DATE</span>
                    <span className="acd-field__value">{facts.date || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Mediator Notes */}
              <div className="acd-card">
                <div className="acd-card__header">
                  <FaStickyNote className="acd-card__header-icon" />
                  <h3 className="acd-card__title">Mediator Notes</h3>
                </div>
                {caseNotes.length === 0 ? (
                  <p className="acd-empty-msg">No mediator notes for this case yet.</p>
                ) : (
                  <div className="acd-notes-list">
                    {caseNotes.map((note, idx) => (
                      <div key={note._id || idx} className="acd-note">
                        <div className="acd-note__header">
                          <span className="acd-note__category">{note.category || "General"}</span>
                          <span className="acd-note__date">{fmtDate(note.createdAt)}</span>
                        </div>
                        <p className="acd-note__content">{note.content}</p>
                        {note.authorId?.name && (
                          <div className="acd-note__author">— {note.authorId.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legal Documents */}
              <div className="acd-card">
                <h3 className="acd-card__title" style={{ marginBottom: 20 }}>Legal Documents</h3>
                {documents.length === 0 ? (
                  <p className="acd-empty-msg">No documents uploaded yet.</p>
                ) : (
                  <div className="acd-documents">
                    {documents.map((doc, idx) => {
                      const docType = guessDocType(doc.fileType, doc.title);
                      return (
                        <div key={doc._id || idx} className="acd-doc">
                          <div className="acd-doc__icon-wrap">
                            <DocIcon type={docType} />
                          </div>
                          <div className="acd-doc__info">
                            <div className="acd-doc__name">{doc.title}</div>
                            <div className="acd-doc__meta">Uploaded {fmtDate(doc.createdAt)}</div>
                          </div>
                          <div className="acd-doc__actions">
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="acd-doc__btn"
                              >
                                <FaEye style={{ marginRight: 5, fontSize: 11 }} />View
                              </a>
                            )}
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                download
                                className="acd-doc__btn"
                              >
                                <FaDownload style={{ marginRight: 5, fontSize: 11 }} />Download
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

            {/* RIGHT COLUMN */}
            <div className="acd-col-right">

              {/* Case Participants */}
              <div className="acd-card">
                <h3 className="acd-card__title" style={{ marginBottom: 16 }}>CASE PARTICIPANTS</h3>
                <div className="acd-case-participants">

                  {/* Petitioner */}
                  <div className="acd-case-participant">
                    <div className="acd-case-participant__avatar acd-case-participant__avatar--ph">
                      <span>{petitionerName[0]}</span>
                    </div>
                    <div>
                      <div className="acd-case-participant__name">{petitionerName}</div>
                      <div className="acd-case-participant__role">Petitioner</div>
                    </div>
                  </div>

                  {/* Respondent */}
                  <div className="acd-case-participant">
                    <div className="acd-case-participant__avatar acd-case-participant__avatar--ph">
                      <span>{respondentName[0]}</span>
                    </div>
                    <div>
                      <div className="acd-case-participant__name">{respondentName}</div>
                      <div className="acd-case-participant__role">Respondent</div>
                    </div>
                  </div>

                  {/* Mediator — or assign button when none */}
                  {hasMediator ? (
                    <div className="acd-case-participant">
                      {neutral.avatar
                        ? <img src={neutral.avatar} alt={neutral.name} className="acd-case-participant__avatar" />
                        : <div className="acd-case-participant__avatar acd-case-participant__avatar--ph">
                            <span>{neutral.name?.[0]}</span>
                          </div>
                      }
                      <div>
                        <div className="acd-case-participant__name">{neutral.name}</div>
                        <div className="acd-case-participant__role acd-case-participant__role--mediator">
                          {caseData.neutralType
                            ? caseData.neutralType.charAt(0).toUpperCase() + caseData.neutralType.slice(1)
                            : "Mediator"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dev comment: "When mediator is not assigned, show that button" */
                    <button
                      className="acd-assign-mediator-btn"
                      onClick={() => setShowAssignMediator(true)}
                    >
                      <FaUserPlus className="acd-assign-mediator-btn__icon" />
                      Assign Mediator
                    </button>
                  )}

                </div>
              </div>

              {/* Next Meeting Card */}
              {upcomingMeeting ? (
                <div className="acd-meeting-card">
                  <div className="acd-meeting-card__header">
                    <span className="acd-meeting-card__badge">SCHEDULED</span>
                  </div>
                  <div className="acd-meeting-card__label">Next Video Session</div>
                  <div className="acd-meeting-card__date">{nextSessionLabel}</div>
                  <div className="acd-meeting-card__focus">
                    {upcomingMeeting.meetingTitle || upcomingMeeting.description || "Session details pending."}
                  </div>
                  <button
                    className="acd-meeting-card__join"
                    onClick={() => navigate(`/admin/meetings/lobby/${upcomingMeeting._id}`)}
                  >
                    <FaVideo style={{ marginRight: 8 }} />
                    Join Meeting
                  </button>
                </div>
              ) : (
                <div className="acd-card acd-meeting-card--empty">
                  <p className="acd-empty-msg" style={{ textAlign: "center" }}>No upcoming sessions.</p>
                  <button
                    className="acd-action-btn acd-action-btn--outline"
                    style={{ width: "100%", marginTop: 12, justifyContent: "center" }}
                    onClick={() => setShowSchedule(true)}
                  >
                    <FaVideo style={{ fontSize: 13 }} />
                    Schedule Meeting
                  </button>
                </div>
              )}

              {/* Fee Summary */}
              <div className="acd-card">
                <h3 className="acd-card__title" style={{ marginBottom: 16 }}>FEE SUMMARY</h3>
                <div className="acd-fee">
                  <div className="acd-fee__row">
                    <span>Filing Fee</span>
                    <span>{fmtINR(caseData.filingFee)}</span>
                  </div>
                  <div className="acd-fee__divider" />
                  <div className="acd-fee__row acd-fee__row--bold">
                    <span>Total</span>
                    <span>{fmtINR(caseData.filingFee)}</span>
                  </div>
                  <div className="acd-fee__row acd-fee__row--pending">
                    <span>Balance</span>
                    <span className="acd-fee__pending-val">
                      {caseData.filingFeePaid ? "₹0.00" : fmtINR(caseData.filingFee)}
                    </span>
                  </div>
                  {caseData.filingFeePaid && (
                    <div className="acd-fee__cleared">
                      <FaCheckCircle className="acd-fee__cleared-icon" />
                      ALL DUES CLEARED
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      <ScheduleMeetingModal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        caseData={caseData}
      />

      <AssignMediatorModal
        isOpen={showAssignMediator}
        onClose={() => setShowAssignMediator(false)}
        caseId={id}
        onAssigned={handleMediatorAssigned}
      />

      <RequestDocumentModal
        isOpen={showRequestDoc}
        onClose={() => setShowRequestDoc(false)}
        caseId={id}
        petitionerName={petitionerName}
        respondentName={respondentName}
      />
    </div>
  );
};

export default AdminCaseDetails;
