import Case from "../models/caseModel.js";
import { sendCaseClosedEmails } from "../services/mail.service.js";
import { sendCaseClosedWA }     from "../services/whatsapp.service.js";
import log from "../utils/logger.js";

const CLOSEABLE_STATUSES = ["resolved", "Resolved", "awarded"];

/* ════════════════════════════════════════════════════════════
   GET CLOSURE CHECKLIST STATUS
   GET /api/admin/cases/:id/closure-checklist
   Returns checklist state so frontend can show readiness
════════════════════════════════════════════════════════════ */
export const getClosureChecklist = async (req, res) => {
  try {
    const caseObj = await Case.findById(req.params.id)
      .select("caseId caseTitle status resolutionDraft resolutionSummary awardDocumentUrl awardRef certificateRef isLocked closureMetadata")
      .lean();

    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found" });

    const checklist = {
      isResolved:      CLOSEABLE_STATUSES.includes(caseObj.status),
      hasSummary:      !!(caseObj.resolutionSummary || caseObj.resolutionDraft?.disputeSummary),
      hasAwardDoc:     !!caseObj.awardDocumentUrl || !!caseObj.awardRef,
      hasAwardRef:     !!caseObj.awardRef,
      hasCertificate:  !!caseObj.certificateRef,
      resolutionSubmitted: caseObj.resolutionDraft?.status === "submitted",
      alreadyClosed:   caseObj.isLocked || ["Closed", "closed"].includes(caseObj.status),
    };

    const blockers = [];
    if (!checklist.isResolved)     blockers.push("Case must be in resolved/awarded status before closure");
    if (!checklist.hasSummary)     blockers.push("Resolution summary is missing");
    if (checklist.alreadyClosed)   blockers.push("Case is already closed");

    return res.status(200).json({
      success:        true,
      caseId:         caseObj.caseId,
      status:         caseObj.status,
      isLocked:       caseObj.isLocked,
      closureMetadata: caseObj.closureMetadata || null,
      checklist,
      canClose:       blockers.length === 0,
      blockers,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   FORMALLY CLOSE CASE
   POST /api/admin/cases/:id/close
   Admin only — performs all closure actions atomically
════════════════════════════════════════════════════════════ */
export const closeCase = async (req, res) => {
  try {
    const { closureReason, closureNotes, bypassChecklist = false } = req.body;

    if (!closureReason || closureReason.trim().length < 5)
      return res.status(400).json({ success: false, message: "closureReason is required (min 5 chars)" });

    const caseObj = await Case.findById(req.params.id)
      .populate("claimant", "name email phone")
      .populate("assignedMediator", "name email");

    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found" });

    /* ── Already closed guard ── */
    if (caseObj.isLocked || ["Closed", "closed"].includes(caseObj.status))
      return res.status(409).json({ success: false, message: "Case is already closed" });

    /* ── Prerequisite checks ── */
    if (!bypassChecklist) {
      if (!CLOSEABLE_STATUSES.includes(caseObj.status))
        return res.status(400).json({
          success: false,
          message: `Case must be resolved/awarded before closure. Current status: ${caseObj.status}`,
        });
      if (!caseObj.resolutionSummary && !caseObj.resolutionDraft?.disputeSummary)
        return res.status(400).json({ success: false, message: "Cannot close: resolution summary is missing" });
    }

    const now = new Date();

    /* ── Build checklist snapshot ── */
    const checklistSnapshot = {
      isResolved:      CLOSEABLE_STATUSES.includes(caseObj.status),
      hasSummary:      !!(caseObj.resolutionSummary || caseObj.resolutionDraft?.disputeSummary),
      hasAwardDoc:     !!caseObj.awardDocumentUrl || !!caseObj.awardRef,
      partiesNotified: true, // will be set by notifications below
    };

    /* ── Apply closure atomically ── */
    caseObj.status         = "closed";
    caseObj.isLocked       = true;
    caseObj.closureMetadata = {
      closedAt:      now,
      closedBy:      req.user.id,
      closureReason: closureReason.trim(),
      closureNotes:  (closureNotes || "").trim(),
      checklistSnapshot,
    };

    caseObj.timeline.push({
      action:      "Case Formally Closed",
      performedBy: req.user.id,
      note:        closureReason.trim(),
      isSystem:    false,
    });

    await caseObj.save();

    /* ── Notifications — fire-and-forget, but log result ── */
    const notifPayload = {
      caseData: {
        caseId:           caseObj.caseId,
        caseTitle:        caseObj.caseTitle,
        awardRef:         caseObj.awardRef,
        certificateRef:   caseObj.certificateRef,
        petitionerDetails: caseObj.petitionerDetails,
        respondent:       caseObj.respondent,
        defendantDetails: caseObj.defendantDetails,
        claimant:         caseObj.claimant,
      },
      closureReason: closureReason.trim(),
      closedBy:      req.user.name,
    };

    log.closure(caseObj.caseId, req.user.name, closureReason.trim());

    sendCaseClosedEmails(notifPayload)
      .then(() => log.notifSent("email-closure", caseObj.caseId, "parties", true))
      .catch((e) => {
        log.notifFailed("email-closure", caseObj.caseId, e.message);
        console.warn(`⚠️ Case-closed email failed for ${caseObj.caseId}:`, e.message);
      });

    const claimantPhone   = caseObj.petitionerDetails?.mobile;
    const respondentPhone = caseObj.defendantDetails?.mobile || caseObj.respondent?.phone;
    const waBase = { caseId: caseObj.caseId, caseTitle: caseObj.caseTitle, closureReason: closureReason.trim() };

    if (claimantPhone) {
      sendCaseClosedWA({ ...waBase, phone: claimantPhone, name: caseObj.petitionerDetails?.fullName || "Claimant" })
        .then(() => log.notifSent("wa-closure", caseObj.caseId, claimantPhone, true))
        .catch((e) => log.notifFailed("wa-closure", caseObj.caseId, e.message));
    }
    if (respondentPhone) {
      sendCaseClosedWA({ ...waBase, phone: respondentPhone, name: caseObj.respondent?.name || caseObj.defendantDetails?.fullName || "Respondent" })
        .then(() => log.notifSent("wa-closure", caseObj.caseId, respondentPhone, true))
        .catch((e) => log.notifFailed("wa-closure", caseObj.caseId, e.message));
    }

    return res.status(200).json({
      success:         true,
      message:         "Case formally closed. All parties notified.",
      status:          caseObj.status,
      isLocked:        caseObj.isLocked,
      closureMetadata: caseObj.closureMetadata,
    });
  } catch (err) {
    console.error("❌ closeCase error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   MEDIATOR PROPOSE CLOSURE
   POST /api/mediator/cases/:id/propose-closure
   Mediator signals readiness; admin takes final action
════════════════════════════════════════════════════════════ */
export const proposeClosureMediatorAction = async (req, res) => {
  try {
    const { notes } = req.body;

    const mediatorFilter = (mediatorId) => ({
      $or: [
        { assignedNeutral: mediatorId, neutralType: "mediator" },
        { assignedMediator: mediatorId },
      ],
    });

    const caseObj = await Case.findOne({
      ...mediatorFilter(req.user.id),
      _id: req.params.id,
    });

    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found or not assigned to you" });

    if (caseObj.isLocked || ["Closed", "closed"].includes(caseObj.status))
      return res.status(409).json({ success: false, message: "Case is already closed" });

    if (!["resolved", "Resolved", "awarded"].includes(caseObj.status))
      return res.status(400).json({ success: false, message: "Case must be resolved before proposing closure" });

    caseObj.timeline.push({
      action:      "Closure Proposed by Mediator",
      performedBy: req.user.id,
      note:        notes || "Mediator has proposed formal closure",
      isSystem:    false,
    });

    await caseObj.save();

    return res.status(200).json({
      success: true,
      message: "Closure proposal submitted to admin for review",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
