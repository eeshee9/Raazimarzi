import mongoose from "mongoose";

/* ── Case type prefixes ───────────────
   PR → Property
   RN → Rental
   CN → Consumer
   IN → Individual
   CM → Commercial
──────────────────────────────────── */
export const CASE_PREFIXES = {
  property:   "PR",
  rental:     "RN",
  consumer:   "CN",
  individual: "IN",
  commercial: "CM",
};

/* ── Timeline / Audit entry ── */
const timelineSchema = new mongoose.Schema(
  {
    action:      { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note:        { type: String, default: "" },
    isSystem:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ── Embedded document/evidence entry ── */
const documentSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true },
    fileUrl:    { type: String, required: true },
    fileType:   { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ── Notice sent to respondent ── */
const noticeSchema = new mongoose.Schema(
  {
    sentAt:   { type: Date, default: Date.now },
    channel:  { type: String, enum: ["email", "whatsapp", "sms", "system"], default: "email" },
    noticeNo: { type: Number },
    message:  { type: String },
  },
  { timestamps: true }
);

/* ════════════════════════════════════════
   MAIN CASE SCHEMA
════════════════════════════════════════ */
const caseSchema = new mongoose.Schema(
  {
    /* ── Unique Case ID (e.g. PR-2026-A3F9) ── */
    caseId: {
      type:     String,
      unique:   true,
      required: true,
      index:    true,
    },

    /* ── Case Type ── */
    caseType: {
      type: String,
      enum: ["property", "rental", "consumer", "individual", "commercial"],
      index: true,
    },

    caseTitle:     { type: String, required: true, maxlength: 200 },
    causeOfAction: { type: String, maxlength: 5000 },
    reliefSought:  { type: String, maxlength: 2000 },
    caseValue:     { type: String },

    /* ── Petitioner / Claimant Details (snapshot at filing) ── */
    petitionerDetails: {
      fullName:   { type: String, maxlength: 100 },
      fatherName: { type: String, maxlength: 100 },
      gender:     String,
      dob:        String,
      mobile:     String,
      email:      String,
      address:    { type: String, maxlength: 500 },
      idType:     String,
      idProof:    String,
    },

    /* ── Defendant / Respondent Details (snapshot at filing) ── */
    defendantDetails: {
      fullName:   { type: String, maxlength: 100 },
      fatherName: { type: String, maxlength: 100 },
      gender:     String,
      dob:        String,
      mobile:     String,
      email:      String,
      address:    { type: String, maxlength: 500 },
      idDetails:  String,
    },

    /* ── Case Facts ── */
    caseFacts: {
      caseSummary:      { type: String, maxlength: 5000 },
      documentTitle:    String,
      documentType:     String,
      witnessDetails:   { type: String, maxlength: 2000 },
      place:            { type: String, maxlength: 200 },
      date:             String,
      digitalSignature: String,
      declaration:      { type: Boolean, default: false },
    },

    /* ── Claimant (linked user account) ── */
    claimant: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   "User",
      index: true,
    },

    /* ── Respondent invite system ── */
    respondent: {
      userId: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     "User",
        default: null,
        index:   true,
      },
      email:        { type: String, default: "" },
      phone:        { type: String, default: "" },
      name:         { type: String, default: "" },
      inviteToken:  { type: String, default: null },
      inviteStatus: {
        type:    String,
        enum:    ["pending", "accepted", "declined"],
        default: "pending",
      },
      inviteSentAt:        { type: Date, default: null },
      acceptedAt:          { type: Date, default: null },
      responseText:        { type: String, default: "" },
      responseSubmittedAt: { type: Date, default: null },
    },

    /* ── Notice Period & Ex-Parte ── */
    noticePeriodDays:    { type: Number, default: 30 },
    noticePeriodStartAt: { type: Date,   default: null },
    noticePeriodEndAt:   { type: Date,   default: null },
    noticesSent:         [noticeSchema],

    isExParte:     { type: Boolean, default: false },
    exParteAt:     { type: Date,    default: null },
    exParteReason: { type: String,  default: "" },

    courtReferralIssued: { type: Boolean, default: false },
    courtReferralAt:     { type: Date,    default: null },

    /* ── Admin Review ── */
    adminStatus: {
      type:    String,
      enum:    ["pending-review", "accepted", "rejected"],
      default: "pending-review",
      index:   true,
    },
    adminNote:  { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },

    /* ── Case Lifecycle Status ── */
    status: {
      type: String,
      enum: [
        "Pending",
        "pending-review",
        "In Review",
        "notice-sent",
        "in-progress",
        "Assigned",
        "Hearing",
        "hearing",
        "mediation",
        "arbitration",
        "Resolved",
        "resolved",
        "awarded",
        "Rejected",
        "rejected",
        "withdrawn",
        "Closed",
        "closed",
      ],
      default: "Pending",
      index:   true,
    },

    /* ── Assignment ── */
    assignedCaseManager: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
      index:   true,
    },
    assignedMediator: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
      index:   true,
    },
    assignedNeutral: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",
      default: null,
      index:   true,
    },
    neutralType: {
      type:    String,
      enum:    ["mediator", "arbitrator", null],
      default: null,
    },
    assignedAt: { type: Date, default: null },

    /* ── Priority ── */
    priority: {
      type:    String,
      enum:    ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    /* ── Hearing ── */
    hearingDate:  { type: Date,   default: null },
    hearingLink:  { type: String, default: "" },
    hearingNotes: { type: String, default: "" },

    /* ── Resolution / Award ── */
    resolutionSummary: { type: String, default: "" },
    awardDocumentUrl:  { type: String, default: "" },
    awardType: {
      type:    String,
      enum:    ["settlement", "arbitration-award", "ex-parte-award", "court-referral", ""],
      default: "",
    },
    resolvedAt: { type: Date, default: null },

    /* ── Global / Jurisdiction ── */
    jurisdiction:  { type: String,  default: "IN" },
    currency:      { type: String,  default: "INR" },
    filingFee:     { type: Number,  default: 0 },
    filingFeePaid: { type: Boolean, default: false },

    /* ── Mediator Observations (private, not visible to parties) ── */
    mediatorObservations: { type: String, default: "" },

    /* ── Embedded Documents / Evidence ── */
    documents: [documentSchema],

    /* ── Timeline / Audit Log ── */
    timeline: [timelineSchema],

    /* ── Created By ── */
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
  },
  { timestamps: true }
);

/* ── Indexes ── */
caseSchema.index({ claimant: 1, status: 1 });
caseSchema.index({ "respondent.userId": 1, status: 1 });
caseSchema.index({ "respondent.email": 1 });
caseSchema.index({ assignedCaseManager: 1, status: 1 });
caseSchema.index({ assignedNeutral: 1, status: 1 });
caseSchema.index({ adminStatus: 1, createdAt: -1 });
caseSchema.index({ caseType: 1, status: 1 });

export default mongoose.model("Case", caseSchema);

