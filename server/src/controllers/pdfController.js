import crypto from "crypto";
import Case   from "../models/caseModel.js";
import {
  generateAwardPDF,
  generateSettlementPDF,
  generateCertificatePDF,
} from "../services/pdf.service.js";
import { sendAwardGeneratedEmails } from "../services/mail.service.js";
import { sendResolutionWA }         from "../services/whatsapp.service.js";
import log from "../utils/logger.js";

/* ── Generate a unique award reference ── */
const makeAwardRef = (caseId) => {
  const year   = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RMZ-AWD-${year}-${random}-${String(caseId).replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}`;
};

/* ── Generate a unique certificate reference ── */
const makeCertRef = (caseId) => {
  const year   = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RMZ-CERT-${year}-${random}-${String(caseId).replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}`;
};

/* ════════════════════════════════════════════════════════════
   GENERATE AWARD PDF
   GET /api/pdf/award/:caseId
   Access: arbitrator/mediator assigned to case + admin
════════════════════════════════════════════════════════════ */
export const downloadAwardPDF = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId     = req.user.id;
    const userRole   = req.user.role;

    const caseData = await Case.findById(caseId)
      .populate("claimant",            "name email")
      .populate("createdBy",           "name email")
      .populate("respondent.userId",   "name email")
      .populate("assignedNeutral",     "name email role")
      .populate("assignedCaseManager", "name email")
      .populate("assignedMediator",    "name email")
      .populate("reviewedBy",          "name email");

    if (!caseData)
      return res.status(404).json({ success: false, message: "Case not found" });

    const isAdmin    = userRole === "admin";
    const isNeutral  = caseData.assignedNeutral?._id?.toString() === userId;
    const isMediator = caseData.assignedMediator?._id?.toString() === userId;

    if (!isAdmin && !isNeutral && !isMediator)
      return res.status(403).json({ success: false, message: "Only the assigned arbitrator/mediator or admin can generate the award PDF" });

    const validStatuses = ["awarded", "resolved", "Resolved", "Closed", "closed"];
    if (!validStatuses.includes(caseData.status))
      return res.status(400).json({
        success: false,
        message: `Award PDF can only be generated for resolved/awarded cases. Current status: ${caseData.status}`,
      });

    /* ── Generate award ref (reuse existing if already issued) ── */
    const isRegeneration = !!caseData.awardRef;
    const awardRef       = caseData.awardRef || makeAwardRef(caseData.caseId);
    const awardVersion   = isRegeneration ? (caseData.awardVersion || 1) + 1 : 1;

    log.awardPDF(caseData.caseId, awardRef, req.user.name, isRegeneration);

    const pdfBuffer = caseData.awardType === "settlement"
      ? await generateSettlementPDF(caseData, req.user, awardRef)
      : await generateAwardPDF(caseData, req.user, awardRef);

    const fileName = `RaaziMarzi_Award_${caseData.caseId}_v${awardVersion}.pdf`;

    /* ── Persist award metadata on case record ── */
    await Case.findByIdAndUpdate(caseId, {
      awardRef,
      awardDocumentUrl: `generated:${fileName}`,
      awardGeneratedAt: new Date(),
      awardGeneratedBy: userId,
      awardVersion,
    });

    /* ── Push timeline entry ── */
    await Case.findByIdAndUpdate(caseId, {
      $push: {
        timeline: {
          action:      isRegeneration
            ? `Award PDF Regenerated (v${awardVersion})`
            : "Award PDF Generated",
          performedBy: userId,
          note:        `awardRef: ${awardRef}`,
          isSystem:    true,
        },
      },
    });

    /* ── Fire notifications on first generation only ── */
    if (!isRegeneration) {
      const populatedCase = await Case.findById(caseId)
        .populate("claimant", "name email phone")
        .lean();
      sendAwardGeneratedEmails({ caseData: populatedCase, awardRef, generatedBy: req.user.name }).catch(() => {});
      const claimantPhone   = populatedCase?.petitionerDetails?.mobile;
      const respondentPhone = populatedCase?.defendantDetails?.mobile || populatedCase?.respondent?.phone;
      const caseTitle       = populatedCase?.caseTitle;
      const humanCaseId     = populatedCase?.caseId;
      if (claimantPhone) {
        sendResolutionWA({ phone: claimantPhone, name: populatedCase?.petitionerDetails?.fullName || "Claimant", caseId: humanCaseId, caseTitle, awardRef, role: "claimant" }).catch(() => {});
      }
      if (respondentPhone) {
        sendResolutionWA({ phone: respondentPhone, name: populatedCase?.respondent?.name || populatedCase?.defendantDetails?.fullName || "Respondent", caseId: humanCaseId, caseTitle, awardRef, role: "respondent" }).catch(() => {});
      }
    }

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);
    res.setHeader("X-Award-Ref",         awardRef);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ downloadAwardPDF error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
  }
};

/* ════════════════════════════════════════════════════════════
   PREVIEW AWARD PDF (inline — opens in browser)
   GET /api/pdf/award/:caseId/preview
════════════════════════════════════════════════════════════ */
export const previewAwardPDF = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId     = req.user.id;
    const userRole   = req.user.role;

    const caseData = await Case.findById(caseId)
      .populate("claimant",            "name email")
      .populate("createdBy",           "name email")
      .populate("respondent.userId",   "name email")
      .populate("assignedNeutral",     "name email role")
      .populate("assignedCaseManager", "name email")
      .populate("assignedMediator",    "name email")
      .populate("reviewedBy",          "name email");

    if (!caseData)
      return res.status(404).json({ success: false, message: "Case not found" });

    const isAdmin    = userRole === "admin";
    const isNeutral  = caseData.assignedNeutral?._id?.toString() === userId;
    const isMediator = caseData.assignedMediator?._id?.toString() === userId;

    if (!isAdmin && !isNeutral && !isMediator)
      return res.status(403).json({ success: false, message: "Access denied" });

    const validStatuses = ["awarded", "resolved", "Resolved", "Closed", "closed"];
    if (!validStatuses.includes(caseData.status))
      return res.status(400).json({ success: false, message: `Case status is ${caseData.status} — must be awarded/resolved` });

    const awardRef  = caseData.awardRef || makeAwardRef(caseData.caseId);
    const pdfBuffer = await generateAwardPDF(caseData, req.user, awardRef);
    const fileName  = `RaaziMarzi_Award_${caseData.caseId}.pdf`;

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ previewAwardPDF error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate PDF preview" });
  }
};

/* ════════════════════════════════════════════════════════════
   VERIFY AWARD (public — for QR code scan)
   GET /api/pdf/verify/:awardRef
════════════════════════════════════════════════════════════ */
export const verifyAward = async (req, res) => {
  try {
    const { awardRef } = req.params;
    if (!awardRef) return res.status(400).json({ success: false, message: "awardRef is required" });

    /* ── Primary: look up by stored awardRef field ── */
    const caseData = await Case.findOne({ awardRef })
      .populate("awardGeneratedBy", "name")
      .select("caseId caseTitle status awardType awardRef awardVersion awardGeneratedAt awardGeneratedBy resolvedAt petitionerDetails defendantDetails");

    if (!caseData)
      return res.status(404).json({ success: false, message: "Award not found or invalid reference" });

    return res.status(200).json({
      success:  true,
      verified: true,
      award: {
        awardRef:      caseData.awardRef,
        awardVersion:  caseData.awardVersion,
        caseId:        caseData.caseId,
        caseTitle:     caseData.caseTitle,
        status:        caseData.status,
        awardType:     caseData.awardType,
        issuedOn:      caseData.awardGeneratedAt || caseData.resolvedAt,
        issuedBy:      caseData.awardGeneratedBy?.name || "RaaziMarzi",
        claimant:      caseData.petitionerDetails?.fullName || "N/A",
        respondent:    caseData.defendantDetails?.fullName  || "N/A",
        platform:      "RaaziMarzi Online Dispute Resolution",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ════════════════════════════════════════════════════════════
   GENERATE SETTLEMENT CERTIFICATE
   POST /api/pdf/certificate/:caseId
   Access: admin or assigned mediator
════════════════════════════════════════════════════════════ */
export const generateCertificate = async (req, res) => {
  try {
    const { caseId }       = req.params;
    const { certificateType = "mediation-settlement" } = req.body;
    const userId           = req.user.id;
    const userRole         = req.user.role;

    const validTypes = ["mediation-settlement", "closure", "participation"];
    if (!validTypes.includes(certificateType))
      return res.status(400).json({ success: false, message: `Invalid certificateType. Must be one of: ${validTypes.join(", ")}` });

    const caseData = await Case.findById(caseId)
      .populate("claimant",          "name email")
      .populate("assignedNeutral",   "name email")
      .populate("assignedMediator",  "name email");

    if (!caseData)
      return res.status(404).json({ success: false, message: "Case not found" });

    const isAdmin    = userRole === "admin";
    const isNeutral  = caseData.assignedNeutral?._id?.toString() === userId;
    const isMediator = caseData.assignedMediator?._id?.toString() === userId;

    if (!isAdmin && !isNeutral && !isMediator)
      return res.status(403).json({ success: false, message: "Only admin or assigned mediator can generate certificate" });

    const validStatuses = ["resolved", "Resolved", "awarded", "Closed", "closed"];
    if (!validStatuses.includes(caseData.status))
      return res.status(400).json({ success: false, message: `Certificate requires resolved/closed case. Current: ${caseData.status}` });

    const certRef    = makeCertRef(caseData.caseId);
    const pdfBuffer  = await generateCertificatePDF(caseData, req.user, certRef, certificateType);
    const fileName   = `RaaziMarzi_Certificate_${caseData.caseId}_${certRef}.pdf`;

    await Case.findByIdAndUpdate(caseId, {
      certificateRef:         certRef,
      certificateType,
      certificateGeneratedAt: new Date(),
      certificateGeneratedBy: userId,
      certificateUrl:         `generated:${fileName}`,
      $push: {
        timeline: {
          action:      `Certificate Generated (${certificateType})`,
          performedBy: userId,
          note:        `certRef: ${certRef}`,
          isSystem:    true,
        },
      },
    });

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);
    res.setHeader("X-Certificate-Ref",   certRef);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ generateCertificate error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate certificate", error: error.message });
  }
};

/* ════════════════════════════════════════════════════════════
   VERIFY CERTIFICATE (public)
   GET /api/pdf/verify-cert/:certRef
════════════════════════════════════════════════════════════ */
export const verifyCertificate = async (req, res) => {
  try {
    const { certRef } = req.params;
    const caseData = await Case.findOne({ certificateRef: certRef })
      .populate("certificateGeneratedBy", "name")
      .select("caseId caseTitle status certificateRef certificateType certificateGeneratedAt certificateGeneratedBy petitionerDetails defendantDetails");

    if (!caseData)
      return res.status(404).json({ success: false, message: "Certificate not found or invalid reference" });

    return res.status(200).json({
      success:  true,
      verified: true,
      certificate: {
        certRef:          caseData.certificateRef,
        certificateType:  caseData.certificateType,
        caseId:           caseData.caseId,
        caseTitle:        caseData.caseTitle,
        issuedOn:         caseData.certificateGeneratedAt,
        issuedBy:         caseData.certificateGeneratedBy?.name || "RaaziMarzi",
        claimant:         caseData.petitionerDetails?.fullName || "N/A",
        respondent:       caseData.defendantDetails?.fullName  || "N/A",
        platform:         "RaaziMarzi Online Dispute Resolution",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
