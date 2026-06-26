import Case, { CASE_PREFIXES } from "../models/caseModel.js";
import User from "../models/userModel.js";
import { normalizeCaseType } from "../utils/normalizeCaseType.js";
// import Payment from "../models/paymentModel.js";  // re-enable when payment is ready
import nodemailer from "nodemailer";
import crypto from "crypto";
import {
  isJunkName, isJunkText, isRepeatedDigits, validateDob, isSameParty,
  stripControlChars, validateLength,
} from "../utils/validateCase.js";
import { canAccessCase } from "../utils/accessControl.js";

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return stripControlChars(input.trim().replace(/[<>]/g, ""));
};
const generateCaseId = (caseType) => {
  const prefix = CASE_PREFIXES[caseType] || "CS";
  const year   = new Date().getFullYear();
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${year}-${random}`;
};
const generateInviteToken = () => crypto.randomBytes(32).toString("hex");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.zoho.in", port: 465, secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

// In-process lock against the *exact* double-click race: the 2-minute
// duplicate-window check below is read-then-write (findOne, then create),
// so two requests arriving milliseconds apart can both pass the check before
// either finishes writing — confirmed live (two concurrent identical
// requests produced two separate cases before this lock was added). This
// closes that race for a single server process; it does NOT protect across
// multiple horizontally-scaled instances, which would need a distributed
// lock (e.g. Redis) or a unique-indexed idempotency key instead.
const filingInProgress = new Set();

export const fileNewCase = async (req, res) => {
  let lockKey = null;
  try {
    const {
      caseType, caseTitle, causeOfAction, reliefSought, caseValue,
      petitioner, defendant, caseFacts,
    } = req.body;

    if (req.user?.id) {
      // Only set lockKey once we've actually added it to the set — otherwise
      // the `finally` below would delete the in-flight request's lock when
      // THIS (rejected, never-locked) request unwinds, defeating the guard.
      if (filingInProgress.has(req.user.id)) {
        return res.status(409).json({
          success: false,
          message: "A case submission is already being processed for your account. Please wait a moment and check My Cases before retrying.",
        });
      }
      filingInProgress.add(req.user.id);
      lockKey = req.user.id;
    }

    // ── Required field checks ─────────────────────────────────────────────────
    if (!caseTitle || !petitioner?.fullName || !caseFacts?.declaration)
      return res.status(400).json({
        success: false,
        message: "Required fields missing or declaration not accepted",
      });
    if (!petitioner.email?.trim())
      return res.status(400).json({ success: false, message: "Petitioner email is required" });
    if (!validateEmail(petitioner.email))
      return res.status(400).json({ success: false, message: "Invalid petitioner email format" });
    if (!defendant.email?.trim())
      return res.status(400).json({ success: false, message: "Defendant email is required" });
    if (!validateEmail(defendant.email))
      return res.status(400).json({ success: false, message: "Invalid defendant email format" });
    if (!validatePhone(petitioner.mobile))
      return res.status(400).json({ success: false, message: "Petitioner mobile must be 10 digits" });
    if (!validatePhone(defendant.mobile))
      return res.status(400).json({ success: false, message: "Defendant mobile must be 10 digits" });
    if (!req.user?.id)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (defendant.email?.toLowerCase() === req.user.email?.toLowerCase())
      return res.status(400).json({ success: false, message: "You cannot file a case against yourself" });

    // ── Production hardening: DOB, dummy data, and same-party checks ──────────
    // Source of truth — the frontend mirrors these for UX, but a request that
    // bypasses it (e.g. a direct API call) must still be rejected here.
    const petitionerDobError = validateDob(petitioner.dob, { required: true });
    if (petitionerDobError)
      return res.status(400).json({ success: false, message: `Petitioner: ${petitionerDobError}` });
    const defendantDobError = validateDob(defendant.dob, { required: false });
    if (defendantDobError)
      return res.status(400).json({ success: false, message: `Defendant: ${defendantDobError}` });

    if (isJunkName(petitioner.fullName))
      return res.status(400).json({ success: false, message: "Petitioner name looks like placeholder/test data" });
    if (isJunkName(defendant.fullName))
      return res.status(400).json({ success: false, message: "Defendant name looks like placeholder/test data" });
    if (isJunkText(caseTitle, 3))
      return res.status(400).json({ success: false, message: "Case title looks like placeholder/test data" });
    const caseTitleLengthError = validateLength(caseTitle, { min: 3, max: 200, label: "Case title" });
    if (caseTitleLengthError)
      return res.status(400).json({ success: false, message: caseTitleLengthError });

    if (isJunkText(causeOfAction, 100) || isJunkText(caseFacts?.caseSummary, 100))
      return res.status(400).json({
        success: false,
        message: "Dispute description is too short or looks like placeholder text — please describe the dispute in at least 100 characters",
      });
    const descriptionLengthError = validateLength(causeOfAction, { min: 100, max: 5000, label: "Dispute description" });
    if (descriptionLengthError)
      return res.status(400).json({ success: false, message: descriptionLengthError });

    if (isRepeatedDigits(petitioner.mobile))
      return res.status(400).json({ success: false, message: "Petitioner mobile number looks invalid" });
    if (isRepeatedDigits(defendant.mobile))
      return res.status(400).json({ success: false, message: "Defendant mobile number looks invalid" });

    // Respondent address: required and persisted just like the petitioner's —
    // it was previously collected and required on the frontend (Step 1) but
    // silently dropped before reaching the API, and the schema had nowhere to
    // store it. Both are now fixed; enforce it the same way as the petitioner's.
    const petitionerAddressError = validateLength(petitioner.address, { min: 10, max: 500, label: "Petitioner address" });
    if (petitionerAddressError)
      return res.status(400).json({ success: false, message: petitionerAddressError });
    const defendantAddressError = validateLength(defendant.address, { min: 10, max: 500, label: "Defendant address" });
    if (defendantAddressError)
      return res.status(400).json({ success: false, message: defendantAddressError });

    if (isSameParty(petitioner, defendant))
      return res.status(400).json({ success: false, message: "Petitioner and respondent details cannot be the same." });

    /* ── Payment verification (commented out until payment is re-enabled) ─────
    const { razorpayOrderId } = req.body;
    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Filing fee payment is required before filing a case",
        code:    "PAYMENT_REQUIRED",
      });
    }
    const payment = await Payment.findOne({
      razorpayOrderId,
      userId:   req.user.id,
      status:   "paid",
      caseType: sanitizeInput(caseType),
      caseId:   null,
    });
    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Valid payment not found. Please complete the filing fee payment first.",
        code:    "PAYMENT_NOT_FOUND",
      });
    }
    ─────────────────────────────────────────────────────────────────────────── */

    const createdBy = req.user.id;

    // ── Duplicate-submission guard ────────────────────────────────────────────
    // Catches double-clicks, slow-network retries, and resubmits after a
    // perceived failure (e.g. a document upload error on an already-created
    // case): if this user filed an identical case in the last 2 minutes,
    // return that case instead of creating a new one.
    const duplicateWindow = new Date(Date.now() - 2 * 60 * 1000);
    const existingCase = await Case.findOne({
      createdBy,
      caseTitle: sanitizeInput(caseTitle),
      "defendantDetails.email": { $regex: `^${escapeRegex(sanitizeInput(defendant.email))}$`, $options: "i" },
      createdAt: { $gte: duplicateWindow },
    }).sort({ createdAt: -1 });
    if (existingCase) {
      console.warn(
        `⚠️  Duplicate case-filing attempt suppressed — user=${createdBy} title="${sanitizeInput(caseTitle)}" ` +
        `existingCaseId=${existingCase.caseId} secondsSinceOriginal=${Math.round((Date.now() - existingCase.createdAt.getTime()) / 1000)}`
      );
      return res.status(200).json({
        success: true,
        message: "Case filed successfully",
        case: existingCase,
        duplicate: true,
      });
    }

    const caseId       = generateCaseId(caseType);
    const inviteToken  = generateInviteToken();
    const existingResp = await User.findOne({ email: defendant.email.toLowerCase() });

    const newCase = await Case.create({
      caseId,
      // Normalize to the valid enum when possible; otherwise fall back to the
      // sanitized raw value so Mongoose's own enum validation still applies.
      caseType:      normalizeCaseType(sanitizeInput(caseType)) || sanitizeInput(caseType),
      caseTitle:     sanitizeInput(caseTitle),
      causeOfAction: sanitizeInput(causeOfAction),
      reliefSought:  sanitizeInput(reliefSought),
      caseValue:     sanitizeInput(caseValue),
      petitionerDetails: {
        fullName:   sanitizeInput(petitioner.fullName),
        fatherName: sanitizeInput(petitioner.fatherName),
        gender:     sanitizeInput(petitioner.gender),
        dob:        petitioner.dob,
        mobile:     sanitizeInput(petitioner.mobile),
        email:      sanitizeInput(petitioner.email),
        address:    sanitizeInput(petitioner.address),
        idType:     sanitizeInput(petitioner.idType),
        idProof:    sanitizeInput(petitioner.idProof),
      },
      defendantDetails: {
        fullName:   sanitizeInput(defendant.fullName),
        fatherName: sanitizeInput(defendant.fatherName),
        gender:     sanitizeInput(defendant.gender),
        dob:        defendant.dob,
        mobile:     sanitizeInput(defendant.mobile),
        email:      sanitizeInput(defendant.email),
        address:    sanitizeInput(defendant.address),
        idDetails:  sanitizeInput(defendant.idDetails),
      },
      caseFacts: {
        caseSummary:      sanitizeInput(caseFacts.caseSummary),
        documentTitle:    sanitizeInput(caseFacts.documentTitle),
        documentType:     sanitizeInput(caseFacts.documentType),
        witnessDetails:   sanitizeInput(caseFacts.witnessDetails),
        place:            sanitizeInput(caseFacts.place),
        date:             caseFacts.date,
        digitalSignature: sanitizeInput(caseFacts.digitalSignature),
        declaration:      caseFacts.declaration,
      },
      claimant:  createdBy,
      respondent: {
        userId:       existingResp?._id || null,
        email:        defendant.email.toLowerCase(),
        phone:        defendant.mobile  || "",
        name:         defendant.fullName || "",
        inviteToken,
        inviteStatus: "pending",
        inviteSentAt: new Date(),
      },
      createdBy,
      status:      "Pending",
      adminStatus: "pending-review",
      // filingFee and filingFeePaid will be set once payment is re-enabled
      timeline: [{
        action:      "Case Filed",
        performedBy: createdBy,
        note:        `${caseType || "New"} case filed`,
        isSystem:    false,
      }],
    });

    // ── Send admin notification email ─────────────────────────────────────────
    // Fire-and-forget: a slow/unreachable SMTP server must not delay the
    // response to the client, since that's what tempts users into clicking
    // "Submit" a second time and filing a duplicate case.
    (async () => {
      try {
        await getTransporter().sendMail({
          from:    `"RaaziMarzi" <${process.env.EMAIL_USER}>`,
          to:      process.env.ADMIN_EMAIL,
          subject: `📁 New Case Filed | ${caseId}`,
          html: `
            <h2>📂 New Case Filed</h2><hr />
            <h3>🧾 Case Details</h3>
            <p><strong>Case ID:</strong> ${caseId}</p>
            <p><strong>Case Type:</strong> ${caseType || "N/A"}</p>
            <p><strong>Title:</strong> ${caseTitle}</p>
            <p><strong>Cause of Action:</strong> ${causeOfAction || "N/A"}</p>
            <p><strong>Relief Sought:</strong> ${reliefSought || "N/A"}</p>
            <p><strong>Case Value:</strong> ${caseValue || "N/A"}</p>
            <hr />
            <h3>👤 Petitioner Details</h3>
            <p><strong>Name:</strong> ${petitioner?.fullName}</p>
            <p><strong>Father/Spouse:</strong> ${petitioner?.fatherName || "N/A"}</p>
            <p><strong>Gender:</strong> ${petitioner?.gender}</p>
            <p><strong>DOB:</strong> ${petitioner?.dob}</p>
            <p><strong>Mobile:</strong> ${petitioner?.mobile}</p>
            <p><strong>Email:</strong> ${petitioner?.email}</p>
            <p><strong>Address:</strong> ${petitioner?.address || "N/A"}</p>
            <p><strong>ID Proof:</strong> ${petitioner?.idType || ""} ${petitioner?.idProof || ""}</p>
            <hr />
            <h3>👥 Defendant Details</h3>
            <p><strong>Name:</strong> ${defendant?.fullName}</p>
            <p><strong>Father/Spouse:</strong> ${defendant?.fatherName || "N/A"}</p>
            <p><strong>Gender:</strong> ${defendant?.gender || "N/A"}</p>
            <p><strong>DOB:</strong> ${defendant?.dob || "N/A"}</p>
            <p><strong>Mobile:</strong> ${defendant?.mobile}</p>
            <p><strong>Email:</strong> ${defendant?.email}</p>
            <p><strong>ID Details:</strong> ${defendant?.idDetails || "N/A"}</p>
            <hr />
            <h3>📑 Case Facts</h3>
            <p><strong>Summary:</strong> ${caseFacts?.caseSummary || "N/A"}</p>
            <p><strong>Place:</strong> ${caseFacts?.place || "N/A"}</p>
            <p><strong>Date:</strong> ${caseFacts?.date || "N/A"}</p>
            <hr />
            <h3>👨‍💼 Filed By</h3>
            <p><strong>User Email:</strong> ${req.user.email}</p>
            <p><strong>Filed At:</strong> ${new Date().toLocaleString()}</p>
            <br /><p style="color:gray;">— RaaziMarzi System</p>
          `,
        });
        console.log("✅ Admin email sent for case:", caseId);
      } catch (mailError) {
        console.warn("⚠️ Admin email failed:", mailError.message);
      }
    })();

    return res.status(201).json({ success: true, message: "Case filed successfully", case: newCase });
  } catch (error) {
    console.error("❌ fileNewCase error:", error);
    if (error.name === "ValidationError")
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    return res.status(500).json({ success: false, message: "Server error while filing case" });
  } finally {
    if (lockKey) filingInProgress.delete(lockKey);
  }
};

export const getAllCases = async (req, res) => {
  try {
    const { status, caseType, adminStatus, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status)      filter.status      = status;
    if (caseType)    filter.caseType    = caseType;
    if (adminStatus) filter.adminStatus = adminStatus;
    if (search)
      filter.$or = [
        { caseTitle: { $regex: search, $options: "i" } },
        { caseId:    { $regex: search, $options: "i" } },
      ];
    const total = await Case.countDocuments(filter);
    const cases = await Case.find(filter)
      .populate("createdBy",            "name email role")
      .populate("claimant",             "name email")
      .populate("respondent.userId",    "name email")
      .populate("assignedCaseManager",  "name email")
      .populate("assignedNeutral",      "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    return res.status(200).json({ success: true, count: cases.length, total, cases });
  } catch (error) {
    console.error("❌ getAllCases error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cases" });
  }
};

export const getCaseById = async (req, res) => {
  try {
    // Check existence first (404, not 403, for a bad/unknown ID) before doing
    // any access check or populating — a denied request must never see the
    // populated document, only a generic message.
    const exists = await Case.exists({ _id: req.params.id });
    if (!exists)
      return res.status(404).json({ success: false, message: "Case not found" });

    const hasAccess = await canAccessCase(req.user.id, req.params.id, req.user.role);
    if (!hasAccess)
      return res.status(403).json({ success: false, message: "You are not authorized to view this case." });

    const singleCase = await Case.findById(req.params.id)
      .populate("createdBy",           "name email")
      .populate("claimant",            "name email avatar phone")
      .populate("respondent.userId",   "name email avatar phone")
      .populate("assignedCaseManager", "name email avatar")
      .populate("assignedNeutral",     "name email avatar role")
      .populate("timeline.performedBy","name role");
    return res.status(200).json({ success: true, case: singleCase });
  } catch (error) {
    console.error("❌ getCaseById error:", error);
    return res.status(500).json({ success: false, message: "Error fetching case" });
  }
};

export const updateCaseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "Pending","pending-review","In Review","notice-sent","in-progress",
      "Assigned","Hearing","hearing","mediation","arbitration",
      "Resolved","resolved","awarded","Rejected","rejected",
      "withdrawn","Closed","closed",
    ];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status value" });
    const updatedCase = await Case.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updatedCase)
      return res.status(404).json({ success: false, message: "Case not found" });
    return res.status(200).json({ success: true, message: "Status updated", case: updatedCase });
  } catch (error) {
    console.error("❌ updateCaseStatus error:", error);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Not authorized" });
    const baseUrl   = process.env.API_URL || `${req.protocol}://${req.get("host")}`;
    const avatarUrl = req.user.avatar ? `${baseUrl}/uploads/avatars/${req.user.avatar}` : "";
    return res.status(200).json({
      success: true,
      _id: req.user._id, name: req.user.name, fullName: req.user.name,
      email: req.user.email, role: req.user.role, avatar: avatarUrl,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUserCases = async (req, res) => {
  try {
    const userId = req.user?.id, userEmail = req.user?.email;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const raisedCases = await Case.find({
      $or: [{ createdBy: userId }, { claimant: userId }],
    })
      .populate("assignedCaseManager", "name email")
      .populate("assignedNeutral",     "name email role")
      .sort({ createdAt: -1 })
      .lean();
    let opponentCases = [];
    if (userEmail) {
      opponentCases = await Case.find({
        $or: [
          { "respondent.userId":        userId },
          { "respondent.email":         userEmail.toLowerCase() },
          { "defendantDetails.email":   userEmail },
        ],
        $and: [{ createdBy: { $ne: userId } }, { claimant: { $ne: userId } }],
      })
        .populate("claimant",        "name email")
        .populate("createdBy",       "name email")
        .populate("assignedNeutral", "name email role")
        .sort({ createdAt: -1 })
        .lean();
    }
    return res.status(200).json({ success: true, raisedCases, opponentCases });
  } catch (error) {
    console.error("❌ getUserCases error:", error);
    return res.status(500).json({ success: false, message: "Error fetching user cases" });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const caseData = await Case.findOne({
      "respondent.inviteToken":  req.params.token,
      "respondent.inviteStatus": "pending",
    });
    if (!caseData)
      return res.status(400).json({ success: false, message: "Invalid or expired invite link" });
    caseData.respondent.userId       = req.user.id;
    caseData.respondent.inviteStatus = "accepted";
    caseData.respondent.acceptedAt   = new Date();
    caseData.respondent.inviteToken  = null;
    if (caseData.status === "notice-sent") caseData.status = "in-progress";
    caseData.timeline.push({
      action:      "Respondent Accepted Invite",
      performedBy: req.user.id,
      note:        `${req.user.name} joined as respondent`,
      isSystem:    false,
    });
    await caseData.save();
    return res.status(200).json({ success: true, message: "You have joined the case", case: caseData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitResponse = async (req, res) => {
  try {
    const { responseText } = req.body;
    if (!responseText)
      return res.status(400).json({ success: false, message: "Response text is required" });
    const caseData = await Case.findOne({
      _id: req.params.id,
      $or: [
        { "respondent.userId":  req.user.id },
        { "respondent.email":   req.user.email?.toLowerCase() },
        { "defendantDetails.email": req.user.email },
      ],
    });
    if (!caseData)
      return res.status(404).json({ success: false, message: "Case not found or access denied" });
    if (caseData.respondent.responseSubmittedAt)
      return res.status(400).json({ success: false, message: "Response already submitted" });
    caseData.respondent.responseText        = responseText;
    caseData.respondent.responseSubmittedAt = new Date();
    caseData.timeline.push({
      action:      "Respondent Submitted Response",
      performedBy: req.user.id,
      note:        "Formal response submitted",
      isSystem:    false,
    });
    await caseData.save();
    return res.status(200).json({ success: true, message: "Response submitted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const withdrawCase = async (req, res) => {
  try {
    const caseData = await Case.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user.id }, { claimant: req.user.id }],
    });
    if (!caseData)
      return res.status(404).json({ success: false, message: "Case not found" });
    const nonWithdrawable = ["Resolved","resolved","awarded","Closed","closed","withdrawn","Rejected","rejected"];
    if (nonWithdrawable.includes(caseData.status))
      return res.status(400).json({ success: false, message: `Cannot withdraw: ${caseData.status}` });
    caseData.status = "withdrawn";
    caseData.timeline.push({
      action:      "Case Withdrawn",
      performedBy: req.user.id,
      note:        req.body.reason || "Withdrawn by claimant",
      isSystem:    false,
    });
    await caseData.save();
    return res.status(200).json({ success: true, message: "Case withdrawn successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseTimeline = async (req, res) => {
  try {
    const caseData = await Case.findOne({
      _id: req.params.id,
      $or: [
        { createdBy:             req.user.id },
        { claimant:              req.user.id },
        { "respondent.userId":   req.user.id },
        { "respondent.email":    req.user.email?.toLowerCase() },
      ],
    }).populate("timeline.performedBy", "name role");
    if (!caseData)
      return res.status(404).json({ success: false, message: "Case not found" });
    return res.status(200).json({ success: true, timeline: caseData.timeline });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};