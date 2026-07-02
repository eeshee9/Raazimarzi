import User from "../models/userModel.js";
import Case from "../models/caseModel.js";
import {
  uploadDocument as uploadToNeev,
  getPresignedUrl,
} from "../utils/storageProvider.js";

/* ── Same formula as adminMediatorController.makeMediatorId ── */
const makeMediatorId = (id) => {
  const num = parseInt(id.toString().slice(-6), 16) % 9000 + 1000;
  return `MED-${num}`;
};

const ACTIVE_STATUSES = [
  "Assigned", "Hearing", "hearing", "in-progress", "mediation",
];

const mediatorFilter = (id) => ({
  $or: [
    { assignedNeutral: id, neutralType: "mediator" },
    { assignedMediator: id },
  ],
});

const buildAvatarUrl = (req, filename) => {
  if (!filename) return "";
  const base = process.env.API_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/avatars/${filename}`;
};

const VALID_DOC_TYPES = [
  "qualification_degree",
  "mediation_certification",
  "legal_license",
  "govt_id",
  "bar_council_registration",
  "police_verification",
];

/* ═══════════════════════════════════════════════════════════════════
   GET /api/mediator/profile
   Returns own profile + derived stats + mediator display ID.
   Does NOT return presigned URLs here (caller fetches per-doc as needed).
═══════════════════════════════════════════════════════════════════ */
export const getMediatorProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user   = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const [total, active, resolved] = await Promise.all([
      Case.countDocuments(mediatorFilter(userId)),
      Case.countDocuments({ ...mediatorFilter(userId), status: { $in: ACTIVE_STATUSES } }),
      Case.countDocuments({ ...mediatorFilter(userId), status: { $in: ["Resolved", "resolved"] } }),
    ]);

    const successRate = total > 0 ? Math.round((resolved / total) * 100) : null;

    return res.status(200).json({
      success: true,
      profile: {
        _id:                user._id,
        name:               user.name,
        email:              user.email,
        phone:              user.phone,
        dob:                user.dob,
        gender:             user.gender,
        city:               user.city,
        state:              user.state,
        country:            user.country,
        pincode:            user.pincode,
        avatar:             buildAvatarUrl(req, user.avatar),
        bio:                user.bio,
        qualifications:     user.qualifications,
        experience:         user.experience,
        currentDesignation: user.currentDesignation,
        organization:       user.organization,
        languages:          user.languages     || [],
        expertiseAreas:     user.expertiseAreas || [],
        approvalStatus:     user.approvalStatus,
        isActive:           user.isActive,
        createdAt:          user.createdAt,
        // verificationDocs: docType + status + uploadedAt only — no URLs
        // Presigned URLs are fetched on-demand via GET .../documents/:docType/url
        verificationDocs:   (user.verificationDocs || []).map(({ docType, status, uploadedAt }) => ({
          docType, status, uploadedAt,
        })),
        mediatorId: makeMediatorId(user._id),
      },
      stats: { total, active, resolved, successRate },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   PATCH /api/mediator/profile
   Updates mediator-editable fields only.
   approvalStatus / verificationDocs.status / role — admin-only, blocked here.
   avatar — multer file (uploadAvatar disk middleware, applied in route).
═══════════════════════════════════════════════════════════════════ */
const TEXT_FIELDS = [
  "name", "phone", "dob", "gender",
  "city", "state", "country", "pincode",
  "bio", "qualifications", "experience",
  "currentDesignation", "organization",
];

export const updateMediatorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    for (const field of TEXT_FIELDS) {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    }

    if (req.body.languages !== undefined) {
      user.languages = Array.isArray(req.body.languages)
        ? req.body.languages
        : JSON.parse(req.body.languages || "[]");
    }
    if (req.body.expertiseAreas !== undefined) {
      user.expertiseAreas = Array.isArray(req.body.expertiseAreas)
        ? req.body.expertiseAreas
        : JSON.parse(req.body.expertiseAreas || "[]");
    }

    // Avatar via uploadAvatar middleware (disk → uploads/avatars/)
    if (req.file) user.avatar = req.file.filename;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        _id:                user._id,
        name:               user.name,
        email:              user.email,
        phone:              user.phone,
        dob:                user.dob,
        gender:             user.gender,
        city:               user.city,
        state:              user.state,
        country:            user.country,
        pincode:            user.pincode,
        avatar:             buildAvatarUrl(req, user.avatar),
        bio:                user.bio,
        qualifications:     user.qualifications,
        experience:         user.experience,
        currentDesignation: user.currentDesignation,
        organization:       user.organization,
        languages:          user.languages     || [],
        expertiseAreas:     user.expertiseAreas || [],
        approvalStatus:     user.approvalStatus,
        mediatorId:         makeMediatorId(user._id),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GET /api/mediator/profile/documents/:docType/url
   Returns a 300-second presigned URL for viewing a verification doc.
═══════════════════════════════════════════════════════════════════ */
export const getMediatorDocViewUrl = async (req, res) => {
  try {
    const { docType } = req.params;
    if (!VALID_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }

    const user = await User.findById(req.user._id).select("verificationDocs").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const doc = user.verificationDocs?.find((d) => d.docType === docType);
    if (!doc?.fileUrl) {
      return res.status(404).json({ success: false, message: "Document not uploaded yet" });
    }

    const url = await getPresignedUrl(doc.fileUrl, 300);
    return res.status(200).json({ success: true, url });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════
   POST /api/mediator/profile/documents/:docType
   Upload / replace a verification document.
   Resets status → "pending" (admin must re-verify after re-upload).
   Uses documentUpload middleware (memoryStorage → NeevCloud).
═══════════════════════════════════════════════════════════════════ */
export const uploadMediatorVerificationDoc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { docType } = req.params;
    if (!VALID_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Upload to NeevCloud (storageProvider.uploadDocument uses "cases/caseId/userId/..." path,
    // passing "mediator-docs" as the caseId segment produces a workable private key)
    const uploaded = await uploadToNeev(req.file, "mediator-docs", req.user._id);

    const now = new Date();
    const idx = user.verificationDocs.findIndex((d) => d.docType === docType);
    if (idx >= 0) {
      user.verificationDocs[idx].fileUrl    = uploaded.key;
      user.verificationDocs[idx].status     = "pending";
      user.verificationDocs[idx].uploadedAt = now;
    } else {
      user.verificationDocs.push({ docType, fileUrl: uploaded.key, status: "pending", uploadedAt: now });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Document uploaded. An admin will review and verify it.",
      doc: { docType, status: "pending", uploadedAt: now },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
