// src/pages/MediatorDraftResolution.js — Full mediator resolution drafting flow
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileSignature, Save, Send, ChevronLeft, AlertTriangle,
  CheckCircle, Clock, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import MediatorLayout  from "../components/MediatorLayout";
import ConsentModal    from "../components/ConsentModal";
import axiosInstance   from "../api/axios";
import "./MediatorDraftResolution.css";

const RESOLUTION_TYPES = [
  { value: "",           label: "— Select Resolution Type —" },
  { value: "settlement", label: "Mutual Settlement" },
  { value: "award",      label: "Mediation Award" },
  { value: "partial",    label: "Partial Settlement" },
  { value: "dismissed",  label: "Dismissed" },
  { value: "withdrawn",  label: "Withdrawn by Parties" },
];

const AWARD_TYPES = [
  { value: "settlement",          label: "Settlement Agreement" },
  { value: "arbitration-award",   label: "Arbitration Award" },
  { value: "ex-parte-award",      label: "Ex-Parte Award" },
  { value: "court-referral",      label: "Court Referral" },
];

const CONSENT_OPTIONS = [
  { value: "",        label: "— Select Status —" },
  { value: "obtained",label: "Consent Obtained from Both Parties" },
  { value: "waived",  label: "Consent Waived (Arbitration Award)" },
  { value: "pending", label: "Consent Pending" },
];

const INITIAL_FORM = {
  disputeSummary:     "",
  issuesConsidered:   "",
  settlementTerms:    "",
  resolutionType:     "",
  awardType:          "settlement",
  remarks:            "",
  partyConsentStatus: "",
};

const MediatorDraftResolution = () => {
  const { caseId }   = useParams();
  const navigate     = useNavigate();

  const [caseInfo,      setCaseInfo]      = useState(null);
  const [signerInfo,    setSignerInfo]    = useState({ name: "", email: "" });
  const [form,          setForm]          = useState(INITIAL_FORM);
  const [draftStatus,   setDraftStatus]   = useState(null); // "draft" | "submitted"
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");
  const [preview,       setPreview]       = useState(false);
  const [lastSaved,     setLastSaved]     = useState(null);
  const [showConsent,   setShowConsent]   = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const autoSaveTimer = useRef(null);

  /* ── If no caseId param — redirect to my-cases ── */
  useEffect(() => {
    if (!caseId) navigate("/mediator/my-cases");
  }, [caseId, navigate]);

  /* ── Load existing draft on mount ── */
  const loadDraft = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError("");
    try {
      const [resData, profileRes] = await Promise.allSettled([
        axiosInstance.get(`/mediator/cases/${caseId}/resolution`),
        axiosInstance.get("/mediator/profile"),
      ]);
      const res = resData.status === "fulfilled" ? resData.value : null;
      if (!res) throw new Error("Failed to load case");
      const d   = res.data;
      setCaseInfo({ caseId: d.caseId, status: d.status });
      if (profileRes.status === "fulfilled") {
        const p = profileRes.value.data?.profile;
        if (p) setSignerInfo({ name: p.name || "", email: p.email || "" });
      }
      if (d.resolutionDraft) {
        setForm({
          disputeSummary:     d.resolutionDraft.disputeSummary     || "",
          issuesConsidered:   d.resolutionDraft.issuesConsidered   || "",
          settlementTerms:    d.resolutionDraft.settlementTerms    || "",
          resolutionType:     d.resolutionDraft.resolutionType     || "",
          awardType:          d.awardType                          || "settlement",
          remarks:            d.resolutionDraft.remarks            || "",
          partyConsentStatus: d.resolutionDraft.partyConsentStatus || "",
        });
        setDraftStatus(d.resolutionDraft.status || "draft");
      } else if (d.resolutionSummary) {
        /* Pre-fill from legacy resolveCase data */
        setForm(prev => ({
          ...prev,
          disputeSummary: d.resolutionSummary,
          awardType:      d.awardType || "settlement",
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load resolution data");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  /* ── Auto-save on changes (debounced 3s) — only if in draft ── */
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (draftStatus === "submitted") return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraftSilent({ ...form, [field]: value });
    }, 3000);
  };

  const saveDraftSilent = async (data) => {
    try {
      await axiosInstance.patch(`/mediator/cases/${caseId}/resolution/draft`, data);
      setLastSaved(new Date());
      setDraftStatus("draft");
    } catch (_) { /* silent */ }
  };

  /* ── Explicit save draft ── */
  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      await axiosInstance.patch(`/mediator/cases/${caseId}/resolution/draft`, form);
      setLastSaved(new Date());
      setDraftStatus("draft");
      setSuccessMsg("Draft saved successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  /* ── Submit resolution — Step 1: validate + open consent gate ── */
  const handleSubmit = () => {
    setError("");
    if (!form.disputeSummary.trim() || form.disputeSummary.trim().length < 20)
      return setError("Dispute summary is required (minimum 20 characters).");
    if (!form.settlementTerms.trim() || form.settlementTerms.trim().length < 20)
      return setError("Settlement terms are required (minimum 20 characters).");
    if (!form.resolutionType)
      return setError("Please select a resolution type.");
    if (!form.partyConsentStatus)
      return setError("Please indicate party consent status.");
    /* Open consent modal — actual submit happens in onConsentConfirmed */
    setPendingSubmit(true);
    setShowConsent(true);
  };

  /* ── Submit resolution — Step 2: consent recorded, now POST to backend ── */
  const onConsentConfirmed = async (receipt) => {
    setShowConsent(false);
    setPendingSubmit(false);
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.post(`/mediator/cases/${caseId}/resolution/submit`, form);
      setDraftStatus("submitted");
      setSuccessMsg(`Resolution submitted. Consent receipt: ${receipt?.receiptId || "recorded"}. Case is now marked as resolved.`);
      setTimeout(() => navigate("/mediator/my-cases"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit resolution");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Derived ── */
  const isSubmitted    = draftStatus === "submitted";
  const isLocked       = isSubmitted;
  const canSubmit      = form.disputeSummary.trim().length >= 20 &&
                         form.settlementTerms.trim().length >= 20 &&
                         !!form.resolutionType && !!form.partyConsentStatus;

  const StatusBadge = () => {
    if (!draftStatus) return null;
    if (isSubmitted) {
      return <span className="mdr-badge mdr-badge--submitted"><CheckCircle size={12}/> Submitted</span>;
    }
    return <span className="mdr-badge mdr-badge--draft"><Clock size={12}/> Draft</span>;
  };

  if (loading) {
    return (
      <MediatorLayout>
        <div className="mdr-loading">
          <RefreshCw size={22} className="mdr-spin" />
          <span>Loading resolution draft…</span>
        </div>
      </MediatorLayout>
    );
  }

  return (
    <MediatorLayout>
      <div className="mdr-page">

        {/* Header */}
        <div className="mdr-header">
          <button className="mdr-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={16}/> Back
          </button>
          <div className="mdr-header-title">
            <FileSignature size={20}/>
            <div>
              <h1>Draft Resolution</h1>
              {caseInfo && <p className="mdr-case-id">Case: {caseInfo.caseId}</p>}
            </div>
            <StatusBadge />
          </div>
          <div className="mdr-header-actions">
            {lastSaved && !isSubmitted && (
              <span className="mdr-autosave-note">
                Last saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {!isSubmitted && (
              <button
                className="mdr-btn mdr-btn--secondary"
                onClick={() => setPreview(p => !p)}
              >
                {preview ? <><EyeOff size={14}/> Edit</> : <><Eye size={14}/> Preview</>}
              </button>
            )}
          </div>
        </div>

        {/* Disclosure */}
        {!isSubmitted && (
          <div className="mdr-disclosure">
            <AlertTriangle size={14}/>
            <span>
              <strong>Legal Disclosure:</strong> This resolution document will be shared with both parties.
              Ensure all terms are accurate and agreed upon before submitting.
              Once submitted, the case will be formally marked as resolved.
            </span>
          </div>
        )}

        {/* Submitted banner */}
        {isSubmitted && (
          <div className="mdr-submitted-banner">
            <CheckCircle size={18}/>
            <span>This resolution has been submitted and the case is resolved. No further edits are permitted.</span>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mdr-msg mdr-msg--error">
            <AlertTriangle size={14}/> {error}
          </div>
        )}
        {successMsg && (
          <div className="mdr-msg mdr-msg--success">
            <CheckCircle size={14}/> {successMsg}
          </div>
        )}

        {preview ? (
          /* ────── PREVIEW MODE ────── */
          <div className="mdr-preview">
            <h2>Resolution Preview</h2>
            <div className="mdr-preview-block">
              <label>Summary of Dispute</label>
              <p>{form.disputeSummary || <em>Not entered</em>}</p>
            </div>
            <div className="mdr-preview-block">
              <label>Issues Considered</label>
              <p>{form.issuesConsidered || <em>Not entered</em>}</p>
            </div>
            <div className="mdr-preview-block">
              <label>Settlement / Award Terms</label>
              <p>{form.settlementTerms || <em>Not entered</em>}</p>
            </div>
            <div className="mdr-preview-row">
              <div className="mdr-preview-block">
                <label>Resolution Type</label>
                <p>{RESOLUTION_TYPES.find(r => r.value === form.resolutionType)?.label || "—"}</p>
              </div>
              <div className="mdr-preview-block">
                <label>Award Type</label>
                <p>{AWARD_TYPES.find(a => a.value === form.awardType)?.label || "—"}</p>
              </div>
              <div className="mdr-preview-block">
                <label>Party Consent</label>
                <p>{CONSENT_OPTIONS.find(c => c.value === form.partyConsentStatus)?.label || "—"}</p>
              </div>
            </div>
            {form.remarks && (
              <div className="mdr-preview-block">
                <label>Remarks</label>
                <p>{form.remarks}</p>
              </div>
            )}
          </div>
        ) : (
          /* ────── FORM MODE ────── */
          <div className="mdr-form">

            <div className="mdr-section">
              <div className="mdr-section-header">
                <span className="mdr-section-num">1</span>
                <h3>Summary of Dispute</h3>
                <span className="mdr-required">Required</span>
              </div>
              <p className="mdr-hint">Briefly describe the dispute and the mediation process undertaken.</p>
              <textarea
                className="mdr-textarea"
                rows={5}
                placeholder="Summarise the nature of the dispute, positions of both parties, and the mediation sessions conducted…"
                value={form.disputeSummary}
                onChange={e => handleChange("disputeSummary", e.target.value)}
                disabled={isLocked}
                maxLength={3000}
              />
              <div className="mdr-char-count">{form.disputeSummary.length} / 3000</div>
            </div>

            <div className="mdr-section">
              <div className="mdr-section-header">
                <span className="mdr-section-num">2</span>
                <h3>Issues Considered</h3>
                <span className="mdr-optional">Optional</span>
              </div>
              <p className="mdr-hint">List the key issues raised and considered during mediation.</p>
              <textarea
                className="mdr-textarea"
                rows={4}
                placeholder="1. Issue of non-payment…&#10;2. Breach of agreement on…&#10;3. Counter-claim regarding…"
                value={form.issuesConsidered}
                onChange={e => handleChange("issuesConsidered", e.target.value)}
                disabled={isLocked}
                maxLength={2000}
              />
            </div>

            <div className="mdr-section">
              <div className="mdr-section-header">
                <span className="mdr-section-num">3</span>
                <h3>Settlement Terms / Award Terms</h3>
                <span className="mdr-required">Required</span>
              </div>
              <p className="mdr-hint">Specify the exact terms agreed by both parties or the award conditions.</p>
              <textarea
                className="mdr-textarea"
                rows={6}
                placeholder="1. Party A agrees to pay ₹X to Party B within 30 days…&#10;2. Party B agrees to withdraw all pending claims…&#10;3. Both parties agree to maintain confidentiality…"
                value={form.settlementTerms}
                onChange={e => handleChange("settlementTerms", e.target.value)}
                disabled={isLocked}
                maxLength={5000}
              />
              <div className="mdr-char-count">{form.settlementTerms.length} / 5000</div>
            </div>

            <div className="mdr-section mdr-section--row">

              <div className="mdr-field">
                <label className="mdr-label">
                  Resolution Type <span className="mdr-required-star">*</span>
                </label>
                <select
                  className="mdr-select"
                  value={form.resolutionType}
                  onChange={e => handleChange("resolutionType", e.target.value)}
                  disabled={isLocked}
                >
                  {RESOLUTION_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="mdr-field">
                <label className="mdr-label">Award Type</label>
                <select
                  className="mdr-select"
                  value={form.awardType}
                  onChange={e => handleChange("awardType", e.target.value)}
                  disabled={isLocked}
                >
                  {AWARD_TYPES.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="mdr-field">
                <label className="mdr-label">
                  Party Consent Status <span className="mdr-required-star">*</span>
                </label>
                <select
                  className="mdr-select"
                  value={form.partyConsentStatus}
                  onChange={e => handleChange("partyConsentStatus", e.target.value)}
                  disabled={isLocked}
                >
                  {CONSENT_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mdr-section">
              <div className="mdr-section-header">
                <span className="mdr-section-num">5</span>
                <h3>Additional Remarks</h3>
                <span className="mdr-optional">Optional</span>
              </div>
              <textarea
                className="mdr-textarea"
                rows={3}
                placeholder="Any additional notes, conditions, or observations…"
                value={form.remarks}
                onChange={e => handleChange("remarks", e.target.value)}
                disabled={isLocked}
                maxLength={1000}
              />
            </div>

          </div>
        )}

        {/* Actions */}
        {!isSubmitted && (
          <div className="mdr-actions">
            <button
              className="mdr-btn mdr-btn--secondary"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
            >
              {saving ? <RefreshCw size={14} className="mdr-spin"/> : <Save size={14}/>}
              {saving ? " Saving…" : " Save Draft"}
            </button>

            <button
              className="mdr-btn mdr-btn--primary"
              onClick={handleSubmit}
              disabled={submitting || saving || !canSubmit || preview}
              title={!canSubmit ? "Complete all required fields before submitting" : ""}
            >
              {submitting ? <RefreshCw size={14} className="mdr-spin"/> : <Send size={14}/>}
              {submitting ? " Submitting…" : " Submit Resolution"}
            </button>
          </div>
        )}

        {!isSubmitted && !canSubmit && (
          <p className="mdr-submit-hint">
            Complete all required fields (Dispute Summary, Settlement Terms, Resolution Type, Party Consent) to enable submission.
          </p>
        )}

      </div>

      {/* Consent gate — shown before resolution is submitted to backend */}
      <ConsentModal
        isOpen={showConsent && pendingSubmit}
        onClose={() => { setShowConsent(false); setPendingSubmit(false); }}
        onConfirm={onConsentConfirmed}
        caseId={caseId}
        documentStage="resolution"
        documentRef={`${caseInfo?.caseId || caseId}:resolution-draft`}
        signerName={signerInfo.name}
        signerEmail={signerInfo.email}
        title="Resolution Submission Declaration"
      />

    </MediatorLayout>
  );
};

export default MediatorDraftResolution;
