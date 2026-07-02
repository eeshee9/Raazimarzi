/**
 * consentController.js
 *
 * Records a declaration-based consent (text-declaration method).
 * This is NOT PKI eSign — it is a structured audit record that:
 *  - Captures who agreed, to what exact text, at what time, from what device
 *  - Is stored tamper-evidently on the Case record (append-only array)
 *  - Provides a paper-trail for dispute resolution and regulatory review
 *
 * Legal note: Text-declaration consent is prima facie evidence in most
 * Indian courts under the IT Act 2000, but does not constitute a
 * legally enforceable electronic signature under Section 5 / IT Act
 * without a Licensed Certifying Authority (CA). Do not overclaim.
 */

import crypto from "crypto";
import Case   from "../models/caseModel.js";
import User   from "../models/userModel.js";

/* ── Valid stages for which consent can be recorded ── */
const VALID_STAGES = ["filing", "resolution", "closure"];

/* ════════════════════════════════════════════════════════════
   RECORD CONSENT
   POST /api/consent/record
   Body: { caseId, documentStage, consentText, documentRef }
   Auth: any authenticated user (user, mediator, admin)
════════════════════════════════════════════════════════════ */
export const recordConsent = async (req, res) => {
  try {
    const { caseId, documentStage, consentText, documentRef } = req.body;

    /* ── Input validation ── */
    if (!caseId)
      return res.status(400).json({ success: false, message: "caseId is required" });
    if (!VALID_STAGES.includes(documentStage))
      return res.status(400).json({ success: false, message: `documentStage must be one of: ${VALID_STAGES.join(", ")}` });
    if (!consentText || consentText.trim().length < 20)
      return res.status(400).json({ success: false, message: "consentText must be at least 20 characters" });

    const caseObj = await Case.findById(caseId).select("caseId caseTitle isLocked signatureConsents");
    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found" });

    if (caseObj.isLocked)
      return res.status(409).json({ success: false, message: "Case is locked — no further consents can be recorded on a closed case" });

    /* ── Capture IP + User-Agent (lawful under IT Act for audit) ── */
    const ipAddress = (
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown"
    );
    const userAgent = req.headers["user-agent"] || "unknown";

    /* ── Build consent record ── */
    const signer = await User.findById(req.user.id).select("name email").lean();
    const consentRecord = {
      signerUserId:       req.user.id,
      signerName:         signer?.name         || req.user.name  || "Unknown",
      signerEmail:        signer?.email        || req.user.email || "",
      signedAt:           new Date(),
      consentText:        consentText.trim(),
      documentStage,
      documentRef:        documentRef?.trim()  || `case:${caseObj.caseId}:${documentStage}`,
      ipAddress,
      userAgent,
      verificationMethod: "text-declaration",
    };

    /* ── Append to signatureConsents (tamper-evident: append-only) ── */
    await Case.findByIdAndUpdate(caseId, {
      $push: {
        signatureConsents: consentRecord,
        timeline: {
          action:      `Consent Recorded (${documentStage})`,
          performedBy: req.user.id,
          note:        `Text-declaration by ${consentRecord.signerName} <${consentRecord.signerEmail}> for stage: ${documentStage}`,
          isSystem:    true,
        },
      },
    });

    /* ── Return a receipt the UI can display ── */
    const receiptHash = crypto
      .createHash("sha256")
      .update(`${req.user.id}:${caseId}:${documentStage}:${consentRecord.signedAt.toISOString()}:${consentText}`)
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();

    return res.status(201).json({
      success:   true,
      message:   "Consent recorded",
      receipt: {
        receiptId:         `RMZ-CONSENT-${receiptHash}`,
        signerName:        consentRecord.signerName,
        signerEmail:       consentRecord.signerEmail,
        documentStage,
        documentRef:       consentRecord.documentRef,
        signedAt:          consentRecord.signedAt,
        verificationMethod: "text-declaration",
        disclosure:        "This consent was recorded as a text-declaration audit record. It does not constitute a legally valid electronic signature under Section 5 of the IT Act 2000 without certification by a Licensed Certifying Authority.",
      },
    });
  } catch (err) {
    console.error("❌ recordConsent error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   GET CONSENTS FOR CASE
   GET /api/consent/case/:caseId
   Admin or assigned mediator only
════════════════════════════════════════════════════════════ */
export const getCaseConsents = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseObj = await Case.findById(caseId)
      .select("caseId caseTitle signatureConsents")
      .lean();

    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found" });

    /* Role check: admin or mediator assigned to case */
    const userId   = req.user.id;
    const userRole = req.user.role;
    if (userRole !== "admin") {
      const fullCase = await Case.findById(caseId).select("assignedNeutral assignedMediator").lean();
      const isAssigned =
        fullCase?.assignedNeutral?.toString()  === userId ||
        fullCase?.assignedMediator?.toString() === userId;
      if (!isAssigned)
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.status(200).json({
      success:  true,
      caseId:   caseObj.caseId,
      consents: caseObj.signatureConsents || [],
      count:    (caseObj.signatureConsents || []).length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
