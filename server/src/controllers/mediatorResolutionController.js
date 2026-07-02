import Case from "../models/caseModel.js";
import { sendResolutionSubmittedEmail } from "../services/mail.service.js";

/* ── Mediator must be assigned to this case ── */
const mediatorFilter = (mediatorId, extra = {}) => ({
  $or: [
    { assignedNeutral: mediatorId, neutralType: "mediator" },
    { assignedMediator: mediatorId },
  ],
  ...extra,
});

/* ── States from which a resolution draft is allowed ── */
const DRAFTABLE_STATUSES = ["Assigned", "Hearing", "hearing", "in-progress", "mediation"];

/* ════════════════════════════════════════════════════════════
   GET CURRENT RESOLUTION DRAFT
   GET /api/mediator/cases/:id/resolution
════════════════════════════════════════════════════════════ */
export const getResolutionDraft = async (req, res) => {
  try {
    const caseObj = await Case.findOne(
      mediatorFilter(req.user.id, { _id: req.params.id })
    ).select("caseId caseTitle status resolutionDraft resolutionSummary awardType resolvedAt").lean();

    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found or not assigned to you" });

    return res.status(200).json({
      success:         true,
      caseId:          caseObj.caseId,
      status:          caseObj.status,
      resolutionDraft: caseObj.resolutionDraft || null,
      /* expose legacy fields so frontend can pre-fill from old data */
      resolutionSummary: caseObj.resolutionSummary,
      awardType:         caseObj.awardType,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   SAVE / AUTOSAVE RESOLUTION DRAFT
   PATCH /api/mediator/cases/:id/resolution/draft
════════════════════════════════════════════════════════════ */
export const saveResolutionDraft = async (req, res) => {
  try {
    const {
      disputeSummary,
      issuesConsidered,
      settlementTerms,
      resolutionType,
      awardType,
      remarks,
      partyConsentStatus,
    } = req.body;

    const caseObj = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }));
    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found or not assigned to you" });

    if (caseObj.isLocked)
      return res.status(409).json({ success: false, message: "Case is locked and cannot be edited" });

    if (caseObj.resolutionDraft?.status === "submitted")
      return res.status(409).json({ success: false, message: "Resolution already submitted and cannot be edited" });

    if (!DRAFTABLE_STATUSES.includes(caseObj.status) && !["resolved", "Resolved"].includes(caseObj.status))
      return res.status(400).json({
        success: false,
        message: `Cannot draft resolution for case in status: ${caseObj.status}`,
      });

    const isNew          = !caseObj.resolutionDraft?.draftCreatedAt;
    const now            = new Date();

    caseObj.resolutionDraft = {
      ...(caseObj.resolutionDraft?.toObject?.() || caseObj.resolutionDraft || {}),
      disputeSummary:     disputeSummary     ?? caseObj.resolutionDraft?.disputeSummary     ?? "",
      issuesConsidered:   issuesConsidered   ?? caseObj.resolutionDraft?.issuesConsidered   ?? "",
      settlementTerms:    settlementTerms    ?? caseObj.resolutionDraft?.settlementTerms    ?? "",
      resolutionType:     resolutionType     ?? caseObj.resolutionDraft?.resolutionType     ?? "",
      remarks:            remarks            ?? caseObj.resolutionDraft?.remarks            ?? "",
      partyConsentStatus: partyConsentStatus ?? caseObj.resolutionDraft?.partyConsentStatus ?? "",
      status:             "draft",
      draftCreatedAt:     isNew ? now : caseObj.resolutionDraft?.draftCreatedAt,
      draftUpdatedAt:     now,
    };

    if (awardType) caseObj.awardType = awardType;

    if (isNew) {
      caseObj.timeline.push({
        action:      "Resolution Draft Created",
        performedBy: req.user.id,
        note:        `Type: ${resolutionType || "not set"}`,
        isSystem:    false,
      });
    }

    await caseObj.save();

    return res.status(200).json({
      success:         true,
      message:         "Draft saved",
      resolutionDraft: caseObj.resolutionDraft,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   SUBMIT RESOLUTION (finalise — moves case to "resolved")
   POST /api/mediator/cases/:id/resolution/submit
════════════════════════════════════════════════════════════ */
export const submitResolution = async (req, res) => {
  try {
    const {
      disputeSummary,
      issuesConsidered,
      settlementTerms,
      resolutionType,
      awardType,
      remarks,
      partyConsentStatus,
    } = req.body;

    const caseObj = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }))
      .populate("claimant", "name email");

    if (!caseObj)
      return res.status(404).json({ success: false, message: "Case not found or not assigned to you" });

    if (caseObj.isLocked)
      return res.status(409).json({ success: false, message: "Case is locked and cannot be edited" });

    if (caseObj.resolutionDraft?.status === "submitted")
      return res.status(409).json({ success: false, message: "Resolution already submitted" });

    if (!DRAFTABLE_STATUSES.includes(caseObj.status))
      return res.status(400).json({
        success: false,
        message: `Cannot submit resolution for case with status: ${caseObj.status}`,
      });

    /* ── Validate mandatory fields ── */
    const finalDisputeSummary  = disputeSummary  || caseObj.resolutionDraft?.disputeSummary;
    const finalSettlementTerms = settlementTerms || caseObj.resolutionDraft?.settlementTerms;
    const finalResolutionType  = resolutionType  || caseObj.resolutionDraft?.resolutionType;

    if (!finalDisputeSummary || finalDisputeSummary.trim().length < 20)
      return res.status(400).json({ success: false, message: "Dispute summary is required (minimum 20 characters)" });
    if (!finalSettlementTerms || finalSettlementTerms.trim().length < 20)
      return res.status(400).json({ success: false, message: "Settlement terms are required (minimum 20 characters)" });
    if (!finalResolutionType)
      return res.status(400).json({ success: false, message: "Resolution type is required" });

    const now = new Date();

    /* ── Update resolution draft sub-doc ── */
    caseObj.resolutionDraft = {
      disputeSummary:     finalDisputeSummary,
      issuesConsidered:   issuesConsidered   || caseObj.resolutionDraft?.issuesConsidered || "",
      settlementTerms:    finalSettlementTerms,
      resolutionType:     finalResolutionType,
      remarks:            remarks            || caseObj.resolutionDraft?.remarks || "",
      partyConsentStatus: partyConsentStatus || caseObj.resolutionDraft?.partyConsentStatus || "obtained",
      status:             "submitted",
      draftCreatedAt:     caseObj.resolutionDraft?.draftCreatedAt || now,
      draftUpdatedAt:     now,
      submittedAt:        now,
      submittedBy:        req.user.id,
    };

    /* ── Promote case fields + status ── */
    caseObj.resolutionSummary = finalDisputeSummary;
    caseObj.awardType         = awardType || caseObj.awardType || "settlement";
    caseObj.status            = "resolved";
    caseObj.resolvedAt        = now;

    caseObj.timeline.push({
      action:      "Resolution Submitted by Mediator",
      performedBy: req.user.id,
      note:        `Type: ${finalResolutionType} | Terms: ${finalSettlementTerms.substring(0, 100)}`,
      isSystem:    false,
    });

    await caseObj.save();

    /* ── Notify admin ── */
    sendResolutionSubmittedEmail({
      caseData:       { caseId: caseObj.caseId, caseTitle: caseObj.caseTitle },
      mediatorName:   req.user.name,
      resolutionType: finalResolutionType,
      settlementTerms: finalSettlementTerms,
    }).catch(() => {});

    return res.status(200).json({
      success:         true,
      message:         "Resolution submitted. Case marked as resolved.",
      status:          caseObj.status,
      resolutionDraft: caseObj.resolutionDraft,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
