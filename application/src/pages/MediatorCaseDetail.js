import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, Clock, FileText, User, Video,
  Download, AlertCircle, CheckCircle2, Loader2, Save,
  MessageSquare, ExternalLink, Phone, Mail, MapPin,
  File, ChevronRight, Lock,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorCaseDetail.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  "Pending":        { bg: "#FFF7ED", color: "#EA580C", label: "Pending" },
  "pending-review": { bg: "#FFF7ED", color: "#EA580C", label: "Pending Review" },
  "In Review":      { bg: "#EFF6FF", color: "#2563EB", label: "In Review" },
  "notice-sent":    { bg: "#F5F3FF", color: "#7C3AED", label: "Notice Sent" },
  "in-progress":    { bg: "#EFF6FF", color: "#2563EB", label: "In Progress" },
  "Assigned":       { bg: "#EFF6FF", color: "#2563EB", label: "Assigned" },
  "Hearing":        { bg: "#FFFBEB", color: "#D97706", label: "Hearing" },
  "hearing":        { bg: "#FFFBEB", color: "#D97706", label: "Hearing" },
  "mediation":      { bg: "#EFF6FF", color: "#2563EB", label: "Mediation" },
  "arbitration":    { bg: "#F5F3FF", color: "#7C3AED", label: "Arbitration" },
  "Resolved":       { bg: "#ECFDF5", color: "#16A34A", label: "Resolved" },
  "resolved":       { bg: "#ECFDF5", color: "#16A34A", label: "Resolved" },
  "awarded":        { bg: "#ECFDF5", color: "#16A34A", label: "Awarded" },
  "Rejected":       { bg: "#FEF2F2", color: "#DC2626", label: "Rejected" },
  "rejected":       { bg: "#FEF2F2", color: "#DC2626", label: "Rejected" },
  "withdrawn":      { bg: "#F9FAFB", color: "#6B7280", label: "Withdrawn" },
  "Closed":         { bg: "#F9FAFB", color: "#6B7280", label: "Closed" },
  "closed":         { bg: "#F9FAFB", color: "#6B7280", label: "Closed" },
};

const TL_COLOR = {
  "filed":               "#2563EB",
  "respondent-accepted": "#16A34A",
  "assigned":            "#7C3AED",
  "session":             "#D97706",
  "system":              "#9CA3AF",
  "next-session":        "#2563EB",
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const timeAgo = (d) => {
  if (!d) return "";
  const ms    = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days  = Math.floor(ms / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return fmtDate(d);
};

const fmtFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const getInitials = (name) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const statusLabel = (s) =>
  STATUS_CFG[s]?.label ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

// ─── Sub-components ───────────────────────────────────────────────────────────

const PartyCard = ({ role, party, inviteStatus }) => (
  <div className="mcd-party">
    <div className="mcd-party-top">
      {party.avatar
        ? <img src={party.avatar} alt={party.name} className="mcd-party-avatar" />
        : <div className="mcd-party-initials">{getInitials(party.name)}</div>
      }
      <div className="mcd-party-name-block">
        <span className="mcd-party-role">{role}</span>
        <span className="mcd-party-name">{party.name || "—"}</span>
        {inviteStatus && (
          <span className={`mcd-invite mcd-invite-${inviteStatus}`}>
            {inviteStatus}
          </span>
        )}
      </div>
    </div>
    <div className="mcd-party-details">
      {party.email   && <p className="mcd-pd-row"><Mail     size={13} />{party.email}</p>}
      {party.phone   && <p className="mcd-pd-row"><Phone    size={13} />{party.phone}</p>}
      {party.address && <p className="mcd-pd-row"><MapPin   size={13} />{party.address}</p>}
      {party.gender  && <p className="mcd-pd-row"><User     size={13} />{party.gender}</p>}
      {party.dob     && <p className="mcd-pd-row"><Calendar size={13} />DOB: {party.dob}</p>}
      {!party.email && !party.phone && !party.address && (
        <p className="mcd-pd-row mcd-pd-none">No contact details on file</p>
      )}
    </div>
  </div>
);

const DocRow = ({ doc }) => (
  <div className="mcd-doc-row">
    <div className="mcd-doc-icon"><File size={15} /></div>
    <div className="mcd-doc-info">
      <p className="mcd-doc-title">{doc.documentTitle || doc.originalFileName}</p>
      <p className="mcd-doc-meta">
        {[doc.category, doc.fileExtension?.toUpperCase(), fmtFileSize(doc.fileSize)]
          .filter(Boolean).join(" · ")}
      </p>
    </div>
    {doc.fileUrl ? (
      <a
        href={doc.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="mcd-doc-dl"
        title="Download"
      >
        <Download size={14} />
      </a>
    ) : (
      <span className="mcd-doc-dl mcd-doc-dl-na" title="File stored on secure server">
        <Download size={14} />
      </span>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const MediatorCaseDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const [observations, setObs]       = useState("");
  const [saveStatus,   setSaveStatus] = useState("idle");
  const saveTimer = useRef(null);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/mediator/cases/${id}`);
      setData(res.data);
      setObs(res.data.case?.mediatorObservations ?? "");
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "404"
          : (err.response?.data?.message || "Failed to load case")
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const persistObs = useCallback(async (text) => {
    setSaveStatus("saving");
    try {
      await axiosInstance.patch(`/mediator/cases/${id}/observations`, {
        observations: text,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    }
  }, [id]);

  const handleObsChange = (e) => {
    const val = e.target.value;
    setObs(val);
    setSaveStatus("idle");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistObs(val), 1500);
  };

  // ── Loading ──
  if (loading) {
    return (
      <MediatorLayout>
        <div className="mcd-fullstate">
          <Loader2 size={28} className="mcd-spin" />
          <p>Loading case…</p>
        </div>
      </MediatorLayout>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <MediatorLayout>
        <div className="mcd-fullstate">
          <AlertCircle size={40} color="#DC2626" />
          <h2 className="mcd-err-h">
            {error === "404" ? "Case Not Found" : "Failed to Load"}
          </h2>
          <p className="mcd-err-p">
            {error === "404"
              ? "This case doesn't exist or isn't assigned to you."
              : error}
          </p>
          <button
            className="mcd-btn-outline"
            onClick={() => navigate("/mediator/my-cases")}
          >
            <ArrowLeft size={15} /> Back to My Cases
          </button>
        </div>
      </MediatorLayout>
    );
  }

  const { case: c, nextSession, derivedTimeline, documents } = data;

  const scfg = STATUS_CFG[c.status] || { bg: "#F9FAFB", color: "#6B7280" };

  const claimantId = c.claimant?._id?.toString();
  const respUid    = c.respondent?.userId?._id?.toString();
  const petDocs    = documents.filter(d => d.uploadedBy?._id?.toString() === claimantId);
  const respDocs   = documents.filter(d => d.uploadedBy?._id?.toString() === respUid);
  const otherDocs  = documents.filter(d => {
    const u = d.uploadedBy?._id?.toString();
    return u !== claimantId && u !== respUid;
  });

  const petitioner = {
    name:    c.claimant?.name    || c.petitionerDetails?.fullName || "Petitioner",
    email:   c.claimant?.email   || c.petitionerDetails?.email    || "",
    phone:   c.claimant?.phone   || c.petitionerDetails?.mobile   || "",
    gender:  c.claimant?.gender  || c.petitionerDetails?.gender   || "",
    dob:     c.claimant?.dob     || c.petitionerDetails?.dob      || "",
    address: c.claimant?.address || c.petitionerDetails?.address  || "",
    avatar:  c.claimant?.avatar  || null,
  };

  const rUser = c.respondent?.userId;
  const respondent = {
    name:         rUser?.name    || c.respondent?.name    || c.defendantDetails?.fullName || "Respondent",
    email:        rUser?.email   || c.respondent?.email   || c.defendantDetails?.email    || "",
    phone:        rUser?.phone   || c.respondent?.phone   || c.defendantDetails?.mobile   || "",
    gender:       rUser?.gender  || c.defendantDetails?.gender  || "",
    dob:          rUser?.dob     || c.defendantDetails?.dob     || "",
    address:      rUser?.address || c.defendantDetails?.address || "",
    avatar:       rUser?.avatar  || null,
    inviteStatus: c.respondent?.inviteStatus || "pending",
  };

  return (
    <MediatorLayout>
      <div className="mcd-page">

        {/* ── 1. Header ── */}
        <div className="mcd-header">
          <nav className="mcd-breadcrumb">
            <button className="mcd-bc-back" onClick={() => navigate("/mediator/my-cases")}>
              <ArrowLeft size={16} />
            </button>
            <span
              className="mcd-bc-link"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/mediator/my-cases")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/mediator/my-cases")}
            >
              My Cases
            </span>
            <ChevronRight size={13} className="mcd-bc-sep" />
            <span className="mcd-bc-cur">{c.caseId}</span>
          </nav>

          <div className="mcd-header-body">
            <div className="mcd-hb-left">
              <div className="mcd-title-row">
                <h1 className="mcd-title">{c.caseTitle}</h1>
                <span
                  className="mcd-status-pill"
                  style={{ background: scfg.bg, color: scfg.color }}
                >
                  {statusLabel(c.status)}
                </span>
              </div>
              <p className="mcd-subtitle">
                Updated {timeAgo(c.updatedAt)}
                {c.caseType && ` · ${c.caseType.charAt(0).toUpperCase() + c.caseType.slice(1)}`}
                {` · #${c.caseId}`}
              </p>
            </div>

            <div className="mcd-hb-actions">
              <button
                className="mcd-btn-outline"
                onClick={() => navigate("/mediator/messages")}
              >
                <MessageSquare size={15} />
                Message Admin
              </button>

              {/* Draft Resolution — available when case is active and not yet closed */}
              {!["closed","Closed","withdrawn","Rejected","rejected"].includes(c.status) && !c.isLocked && (
                <button
                  className="mcd-btn-outline mcd-btn-purple"
                  onClick={() => navigate(`/mediator/draft-resolution/${id}`)}
                  title="Draft or edit the resolution for this case"
                >
                  <FileText size={15} />
                  Draft Resolution
                </button>
              )}

              {/* Propose Closure — only when resolved/awarded */}
              {["resolved","Resolved","awarded"].includes(c.status) && !c.isLocked && (
                <button
                  className="mcd-btn-outline mcd-btn-green"
                  onClick={() => navigate(`/mediator/close-case/${id}`)}
                  title="Propose formal closure to admin"
                >
                  <CheckCircle2 size={15} />
                  Propose Closure
                </button>
              )}

              {/* Locked indicator */}
              {c.isLocked && (
                <span className="mcd-locked-badge">
                  🔒 Case Closed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Metrics row ── */}
        <div className="mcd-metrics">
          <div className="mcd-metric">
            <span className="mcd-metric-lbl">Total Claim Amount</span>
            <span className="mcd-metric-val">
              {c.caseValue ? `₹${c.caseValue}` : "—"}
            </span>
          </div>
          <div className="mcd-metric">
            <span className="mcd-metric-lbl">Filed Date</span>
            <span className="mcd-metric-val">{fmtDate(c.createdAt)}</span>
          </div>
          <div className="mcd-metric">
            <span className="mcd-metric-lbl">Last Activity</span>
            <span className="mcd-metric-val">{timeAgo(c.updatedAt)}</span>
          </div>
          <div className="mcd-metric">
            <span className="mcd-metric-lbl">Next Session</span>
            <span className={`mcd-metric-val ${nextSession ? "mcd-val-blue" : ""}`}>
              {nextSession ? fmtDate(nextSession.scheduledDate) : "Not Scheduled"}
            </span>
          </div>
        </div>

        {/* ── Main 2-column ── */}
        <div className="mcd-main">

          {/* ─ Left column ─ */}
          <div className="mcd-col-left">

            {/* 3. Timeline */}
            <div className="mcd-card">
              <h3 className="mcd-card-h">Case Progression</h3>
              <div className="mcd-timeline">
                {derivedTimeline.length === 0 && (
                  <p className="mcd-empty">No timeline events yet.</p>
                )}
                {derivedTimeline.map((evt, i) => {
                  const dotColor = TL_COLOR[evt.type] || "#9CA3AF";
                  return (
                    <div
                      key={i}
                      className={`mcd-tl-row${evt.isFuture ? " mcd-tl-future" : ""}`}
                    >
                      <div className="mcd-tl-left">
                        <div
                          className="mcd-tl-dot"
                          style={
                            evt.isFuture
                              ? { background: "transparent", border: `2px dashed ${dotColor}` }
                              : { background: dotColor }
                          }
                        />
                        {i < derivedTimeline.length - 1 && (
                          <div className={`mcd-tl-vline${evt.isFuture ? " mcd-tl-vline-dash" : ""}`} />
                        )}
                      </div>
                      <div className="mcd-tl-body">
                        <p className="mcd-tl-label">{evt.label}</p>
                        <p className="mcd-tl-date">{fmtDateTime(evt.date)}</p>
                        {evt.note && <p className="mcd-tl-note">{evt.note}</p>}
                        {evt.performedBy?.name && (
                          <p className="mcd-tl-by">by {evt.performedBy.name}</p>
                        )}
                        {evt.sessionStatus && (
                          <span className="mcd-tl-tag">{evt.sessionStatus}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Next Session card */}
            {nextSession && (
              <div className="mcd-card mcd-sess-card">
                <div className="mcd-sess-hdr">
                  <div className="mcd-sess-icon-wrap">
                    <Video size={18} color="#2563EB" />
                  </div>
                  <div>
                    <h3 className="mcd-card-h" style={{ marginBottom: 2 }}>
                      {nextSession.meetingTitle || "Next Mediation Session"}
                    </h3>
                    <p className="mcd-sess-type">
                      {nextSession.meetingType || "Video Call"}
                      {nextSession.status && ` · ${nextSession.status}`}
                    </p>
                  </div>
                </div>

                <div className="mcd-sess-meta">
                  <span className="mcd-sess-chip">
                    <Calendar size={12} />
                    {fmtDate(nextSession.scheduledDate)}
                  </span>
                  {(nextSession.startTime || nextSession.endTime) && (
                    <span className="mcd-sess-chip">
                      <Clock size={12} />
                      {nextSession.startTime}
                      {nextSession.endTime ? ` – ${nextSession.endTime}` : ""}
                    </span>
                  )}
                  {nextSession.locationType && (
                    <span className="mcd-sess-chip">{nextSession.locationType}</span>
                  )}
                </div>

                {nextSession.description && (
                  <p className="mcd-sess-desc">{nextSession.description}</p>
                )}

                <button
                  className="mcd-btn-join mcd-btn-join-out"
                  onClick={() => navigate(`/mediator/meetings/${nextSession._id}`)}
                >
                  <Video size={15} />
                  Open Meeting Room
                </button>
                {nextSession.virtualMeeting?.meetingLink && (
                  <button
                    className="mcd-btn-join"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      window.open(nextSession.virtualMeeting.meetingLink, "_blank")
                    }
                  >
                    <Video size={15} />
                    Join Video Call
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>
            )}

            {/* 6. Documents */}
            <div className="mcd-card">
              <h3 className="mcd-card-h">
                Case Documents
                {documents.length > 0 && (
                  <span className="mcd-count-badge">{documents.length}</span>
                )}
              </h3>

              {documents.length === 0 ? (
                <p className="mcd-empty">No documents available for this case.</p>
              ) : (
                <div className="mcd-doc-groups">
                  {petDocs.length > 0 && (
                    <div className="mcd-doc-group">
                      <p className="mcd-doc-group-lbl">Petitioner's Documents</p>
                      {petDocs.map((doc) => (
                        <DocRow key={doc._id} doc={doc} />
                      ))}
                    </div>
                  )}
                  {respDocs.length > 0 && (
                    <div className="mcd-doc-group">
                      <p className="mcd-doc-group-lbl">Respondent's Documents</p>
                      {respDocs.map((doc) => (
                        <DocRow key={doc._id} doc={doc} />
                      ))}
                    </div>
                  )}
                  {otherDocs.length > 0 && (
                    <div className="mcd-doc-group">
                      <p className="mcd-doc-group-lbl">Other Documents</p>
                      {otherDocs.map((doc) => (
                        <DocRow key={doc._id} doc={doc} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─ Right column ─ */}
          <div className="mcd-col-right">

            {/* 4. Participants */}
            <div className="mcd-card">
              <h3 className="mcd-card-h">Participants</h3>
              <PartyCard role="Petitioner" party={petitioner} />
              <div className="mcd-divider" />
              <PartyCard
                role="Respondent"
                party={respondent}
                inviteStatus={respondent.inviteStatus}
              />
            </div>

            {/* 7. Mediator observations */}
            <div className="mcd-card">
              <div className="mcd-obs-hdr">
                <h3 className="mcd-card-h" style={{ margin: 0 }}>
                  Mediator Observations
                </h3>
                <span className="mcd-private-badge">Private</span>
                <button
                  className="mcd-notes-link-btn"
                  onClick={() => navigate(`/mediator/case-notes/${id}`)}
                  title="Open My Case Notes for this case"
                >
                  <ExternalLink size={12} />
                  My Case Notes
                </button>
              </div>
              <p className="mcd-obs-hint">
                Visible only to you — not shared with parties or case manager.
              </p>
              <textarea
                className="mcd-obs-ta"
                value={observations}
                onChange={handleObsChange}
                placeholder="Add your observations, strategy notes, or analysis…"
                rows={9}
              />
              <div className="mcd-obs-foot">
                <span className={`mcd-save-lbl mcd-save-${saveStatus}`}>
                  {saveStatus === "saving" && (
                    <><Loader2 size={13} className="mcd-spin" /> Saving…</>
                  )}
                  {saveStatus === "saved" && (
                    <><CheckCircle2 size={13} /> Saved</>
                  )}
                  {saveStatus === "error" && (
                    <><AlertCircle size={13} /> Failed to save</>
                  )}
                  {saveStatus === "idle" && "Auto-saves while typing"}
                </span>
                <button
                  className="mcd-btn-save"
                  onClick={() => {
                    clearTimeout(saveTimer.current);
                    persistObs(observations);
                  }}
                  disabled={saveStatus === "saving"}
                >
                  <Save size={13} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorCaseDetail;
