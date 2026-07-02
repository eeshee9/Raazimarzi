// src/pages/MediatorCloseCase.js — Formal case closure proposal flow
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronLeft,
  RefreshCw, Lock, FileCheck, FileText, MessageSquare,
  Send,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance   from "../api/axios";
import "./MediatorCloseCase.css";

const MediatorCloseCase = () => {
  const { caseId }   = useParams();
  const navigate     = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [checklist,  setChecklist]  = useState(null);
  const [caseInfo,   setCaseInfo]   = useState(null);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [submitted,  setSubmitted]  = useState(false);

  /* ── If no caseId — go back ── */
  useEffect(() => {
    if (!caseId) navigate("/mediator/my-cases");
  }, [caseId, navigate]);

  /* ── Fetch checklist / pre-requisites from the case ── */
  const loadChecklist = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError("");
    try {
      /* Mediators view their own case detail to assess closure readiness */
      const res = await axiosInstance.get(`/mediator/cases/${caseId}`);
      const c   = res.data.case || res.data;
      setCaseInfo(c);

      const isResolved    = ["resolved", "Resolved", "awarded"].includes(c.status);
      const hasSummary    = !!(c.resolutionSummary || c.resolutionDraft?.disputeSummary);
      const hasAwardDoc   = !!c.awardDocumentUrl || !!c.awardRef;
      const isAlreadyClosed = c.isLocked || ["closed", "Closed"].includes(c.status);
      const draftSubmitted  = c.resolutionDraft?.status === "submitted";

      setChecklist({
        isResolved,
        hasSummary,
        hasAwardDoc,
        draftSubmitted,
        isAlreadyClosed,
        canPropose: isResolved && hasSummary && !isAlreadyClosed,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load case details");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadChecklist(); }, [loadChecklist]);

  /* ── Submit closure proposal to admin ── */
  const handlePropose = async () => {
    if (!checklist?.canPropose) return;
    setError("");

    const confirmed = window.confirm(
      "Propose closure for this case?\n\nThis will notify the admin to formally close the case. All parties will be notified upon admin confirmation."
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await axiosInstance.post(`/mediator/cases/${caseId}/propose-closure`, {
        notes: notes.trim() || "Mediator has proposed formal closure.",
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit closure proposal");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Helper: render checklist row ── */
  const CheckRow = ({ label, passed, description, warn }) => (
    <div className={`mcc-check-row ${passed ? "mcc-check-row--pass" : warn ? "mcc-check-row--warn" : "mcc-check-row--fail"}`}>
      <div className="mcc-check-icon">
        {passed
          ? <CheckCircle2 size={18}/>
          : warn
            ? <AlertTriangle size={18}/>
            : <XCircle size={18}/>
        }
      </div>
      <div className="mcc-check-text">
        <span className="mcc-check-label">{label}</span>
        {description && <span className="mcc-check-desc">{description}</span>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <MediatorLayout>
        <div className="mcc-loading">
          <RefreshCw size={22} className="mcc-spin"/>
          <span>Loading case closure details…</span>
        </div>
      </MediatorLayout>
    );
  }

  return (
    <MediatorLayout>
      <div className="mcc-page">

        {/* Header */}
        <div className="mcc-header">
          <button className="mcc-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={16}/> Back
          </button>
          <div className="mcc-header-title">
            <CheckCircle2 size={20} className="mcc-header-icon"/>
            <div>
              <h1>Propose Case Closure</h1>
              {caseInfo && <p className="mcc-case-id">Case: {caseInfo.caseId} — {caseInfo.caseTitle}</p>}
            </div>
          </div>
        </div>

        {/* Already closed / submitted */}
        {checklist?.isAlreadyClosed && (
          <div className="mcc-info-banner mcc-info-banner--locked">
            <Lock size={16}/>
            <span>This case is already formally closed. No further action is required.</span>
          </div>
        )}

        {submitted && (
          <div className="mcc-info-banner mcc-info-banner--success">
            <CheckCircle2 size={16}/>
            <span>
              Closure proposal submitted to admin. The admin will formally close the case and notify all parties.
              You can track status in the case timeline.
            </span>
          </div>
        )}

        {error && (
          <div className="mcc-msg mcc-msg--error">
            <AlertTriangle size={14}/> {error}
          </div>
        )}

        {/* Checklist */}
        {checklist && !submitted && (
          <>
            <div className="mcc-section">
              <h2 className="mcc-section-title">
                <FileCheck size={16}/> Closure Prerequisites
              </h2>
              <p className="mcc-section-desc">
                All mandatory items must be complete before proposing closure.
                If any item is missing, complete it first from the case detail or resolution screen.
              </p>

              <div className="mcc-checklist">
                <CheckRow
                  label="Case is Resolved or Awarded"
                  passed={checklist.isResolved}
                  description={
                    checklist.isResolved
                      ? `Current status: ${caseInfo?.status}`
                      : `Current status: ${caseInfo?.status} — submit resolution first`
                  }
                />
                <CheckRow
                  label="Resolution Summary Present"
                  passed={checklist.hasSummary}
                  description={
                    checklist.hasSummary
                      ? "Resolution summary is recorded"
                      : "Draft and submit a resolution from the Draft Resolution screen"
                  }
                />
                <CheckRow
                  label="Resolution Draft Submitted"
                  passed={checklist.draftSubmitted}
                  warn={!checklist.draftSubmitted && checklist.hasSummary}
                  description={
                    checklist.draftSubmitted
                      ? "Formal resolution submitted"
                      : checklist.hasSummary
                        ? "Resolution exists but formal draft submission is pending"
                        : "Use 'Draft Resolution' to create and submit the resolution"
                  }
                />
                <CheckRow
                  label="Award Document Generated"
                  passed={checklist.hasAwardDoc}
                  warn={!checklist.hasAwardDoc}
                  description={
                    checklist.hasAwardDoc
                      ? `Award reference: ${caseInfo?.awardRef || "recorded"}`
                      : "Award PDF not yet generated — admin or mediator can generate from case detail"
                  }
                />
              </div>
            </div>

            {/* Closure notes */}
            {!checklist.isAlreadyClosed && (
              <div className="mcc-section">
                <h2 className="mcc-section-title">
                  <MessageSquare size={16}/> Closure Notes (Optional)
                </h2>
                <p className="mcc-section-desc">
                  Add any final notes or handover instructions for the admin reviewing this closure.
                </p>
                <textarea
                  className="mcc-textarea"
                  rows={4}
                  placeholder="E.g. Both parties agreed verbally. Award document to be handed over. No further sessions required."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={1000}
                  disabled={!checklist.canPropose || submitting}
                />
              </div>
            )}

            {/* What happens next */}
            {checklist.canPropose && !checklist.isAlreadyClosed && (
              <div className="mcc-info-banner mcc-info-banner--info">
                <FileText size={15}/>
                <div>
                  <strong>What happens when you propose closure?</strong>
                  <ul className="mcc-next-steps">
                    <li>Admin is notified to formally close the case</li>
                    <li>Admin will verify prerequisites and close with the award reference</li>
                    <li>Both parties receive a closure notification with the award reference</li>
                    <li>Case becomes read-only — no further edits are permitted</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Action */}
            {!checklist.isAlreadyClosed && (
              <div className="mcc-actions">
                <button
                  className="mcc-btn mcc-btn--secondary"
                  onClick={() => navigate(`/mediator/cases/${caseId}`)}
                >
                  View Case Detail
                </button>
                {!checklist.isResolved && (
                  <button
                    className="mcc-btn mcc-btn--warning"
                    onClick={() => navigate(`/mediator/draft-resolution/${caseId}`)}
                  >
                    <FileText size={14}/> Draft Resolution First
                  </button>
                )}
                <button
                  className="mcc-btn mcc-btn--primary"
                  onClick={handlePropose}
                  disabled={!checklist.canPropose || submitting}
                  title={!checklist.canPropose ? "Complete all mandatory prerequisites first" : ""}
                >
                  {submitting
                    ? <><RefreshCw size={14} className="mcc-spin"/> Submitting…</>
                    : <><Send size={14}/> Propose Closure to Admin</>
                  }
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </MediatorLayout>
  );
};

export default MediatorCloseCase;
