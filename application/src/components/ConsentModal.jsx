/**
 * ConsentModal — declaration-based consent capture.
 *
 * Displays the exact consent text that will be stored in the audit record.
 * The user must tick a checkbox AND click "I Agree" to proceed.
 *
 * Props:
 *  isOpen        {boolean}  — whether the modal is visible
 *  onClose       {fn}       — called when user cancels
 *  onConfirm     {fn(receipt)} — called after backend records the consent
 *  caseId        {string}   — MongoDB _id of the case
 *  documentStage {string}   — "filing" | "resolution" | "closure"
 *  documentRef   {string?}  — human-readable reference (e.g. awardRef)
 *  signerName    {string}   — prefilled from current user
 *  signerEmail   {string}   — prefilled from current user
 *  title         {string?}  — modal heading override
 *
 * The consent text shown (and stored) is deterministic from props —
 * the backend also stores it verbatim so the record is self-contained.
 */
import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, X, Loader2, Shield } from "lucide-react";
import axiosInstance from "../api/axios";
import "./ConsentModal.css";

const STAGE_LABELS = {
  filing:     "Case Filing Declaration",
  resolution: "Resolution Acceptance Declaration",
  closure:    "Case Closure Declaration",
};

const buildConsentText = (stage, signerName, documentRef) => {
  const date = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  if (stage === "filing") {
    return `I, ${signerName}, hereby declare on ${date} that:
1. The information provided in this case filing is true and accurate to the best of my knowledge.
2. I consent to RaaziMarzi Online Dispute Resolution Platform facilitating the mediation process for this dispute.
3. I understand that this platform uses declaration-based digital consent, which serves as an audit record. This declaration does not constitute a legally enforceable electronic signature under Section 5 of the IT Act 2000.
4. I agree to participate in the mediation process in good faith and abide by the platform's terms of service.
Reference: ${documentRef || "Case Filing"}`;
  }

  if (stage === "resolution") {
    return `I, ${signerName}, hereby declare on ${date} that:
1. I have reviewed the resolution draft referenced as: ${documentRef || "Resolution Draft"}.
2. The settlement terms recorded reflect the outcome of the mediation process as facilitated by RaaziMarzi.
3. I consent to this resolution being formally recorded and submitted to the platform administrator.
4. I understand that while this declaration is an audit record of my acceptance, it does not constitute a legally binding settlement agreement unless separately executed in a legally prescribed form.
5. I acknowledge that once submitted, this resolution will initiate the formal closure process.
Reference: ${documentRef || "Resolution Draft"}`;
  }

  if (stage === "closure") {
    return `I, ${signerName}, hereby declare on ${date} that:
1. I acknowledge the formal closure of this case referenced as: ${documentRef || "Case"}.
2. I confirm that the closure terms have been communicated to all parties.
3. I understand that once the case is formally closed, it is locked and no further modifications are permitted.
4. This declaration is recorded as an audit entry and does not constitute a legally enforceable instrument.
Reference: ${documentRef || "Case Closure"}`;
  }

  return `I, ${signerName}, hereby declare on ${date} that I consent to the action referenced as: ${documentRef || stage}.`;
};

const ConsentModal = ({
  isOpen,
  onClose,
  onConfirm,
  caseId,
  documentStage,
  documentRef,
  signerName,
  signerEmail,
  title,
}) => {
  const [checked,    setChecked]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);
  const [receipt,    setReceipt]    = useState(null);

  if (!isOpen) return null;

  const consentText = buildConsentText(documentStage, signerName || "the signer", documentRef);
  const heading     = title || STAGE_LABELS[documentStage] || "Consent Declaration";

  const handleConfirm = async () => {
    if (!checked) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await axiosInstance.post("/consent/record", {
        caseId,
        documentStage,
        consentText,
        documentRef: documentRef || "",
      });
      setReceipt(res.data.receipt);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record consent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onConfirm?.(receipt);
    setDone(false);
    setChecked(false);
    setReceipt(null);
  };

  return (
    <div className="cm-overlay" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="cm-modal">

        {/* Header */}
        <div className="cm-header">
          <div className="cm-header-left">
            <Shield size={18} className="cm-shield-icon" />
            <h2 className="cm-title">{heading}</h2>
          </div>
          {!done && (
            <button className="cm-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="cm-success">
            <CheckCircle2 size={40} className="cm-success-icon" />
            <h3 className="cm-success-h">Consent Recorded</h3>
            <p className="cm-success-sub">Your declaration has been stored in the case audit trail.</p>
            {receipt && (
              <div className="cm-receipt">
                <p><strong>Receipt ID:</strong> {receipt.receiptId}</p>
                <p><strong>Signed at:</strong> {new Date(receipt.signedAt).toLocaleString("en-IN")}</p>
                <p><strong>Stage:</strong> {receipt.documentStage}</p>
                <p><strong>Method:</strong> {receipt.verificationMethod}</p>
              </div>
            )}
            <div className="cm-disclosure cm-disclosure--info">
              <AlertTriangle size={14} />
              <span>{receipt?.disclosure}</span>
            </div>
            <button className="cm-btn cm-btn--primary" onClick={handleDone}>
              Continue
            </button>
          </div>
        ) : (
          /* ── Consent form ── */
          <>
            <div className="cm-body">
              {/* Signer info */}
              <div className="cm-signer-row">
                <span className="cm-signer-lbl">Signing as:</span>
                <span className="cm-signer-val">{signerName} &lt;{signerEmail}&gt;</span>
              </div>

              {/* Consent text — shown verbatim, stored verbatim */}
              <div className="cm-consent-box">
                <pre className="cm-consent-text">{consentText}</pre>
              </div>

              {/* Legal disclosure */}
              <div className="cm-disclosure cm-disclosure--warn">
                <AlertTriangle size={14} />
                <span>
                  This is a <strong>text-declaration consent</strong>, not a certified electronic signature
                  under the IT Act 2000. It serves as an audit record only. RaaziMarzi makes no representation
                  of legal enforceability beyond what is expressly provided by applicable law.
                </span>
              </div>

              {error && (
                <div className="cm-error">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              {/* Checkbox */}
              <label className="cm-check-label">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  className="cm-checkbox"
                />
                <span>I have read and understood the above declaration and I voluntarily consent to its recording.</span>
              </label>
            </div>

            {/* Footer */}
            <div className="cm-footer">
              <button className="cm-btn cm-btn--secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                className="cm-btn cm-btn--primary"
                onClick={handleConfirm}
                disabled={!checked || submitting}
              >
                {submitting
                  ? <><Loader2 size={15} className="cm-spin" /> Recording…</>
                  : "I Agree — Record Consent"
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConsentModal;
