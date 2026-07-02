import Case from "../models/caseModel.js";
import User from "../models/userModel.js";
import { sendMediatorApprovedEmail, sendMediatorRejectedEmail } from "../services/mail.service.js";
import { getPresignedUrl } from "../utils/storageProvider.js";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ACTIVE_STATUSES = [
  "in-progress","Assigned","mediation","arbitration","Hearing","hearing","notice-sent",
];
const TERMINAL_STATUSES = [
  "Resolved","resolved","awarded","Rejected","rejected","withdrawn","Closed","closed",
];

const makeMediatorId = (id) => {
  const num = parseInt(id.toString().slice(-6), 16) % 9000 + 1000;
  return `MED-${num}`;
};

/* ════════════════════════════════════════
   GET /admin/mediators
   Paginated list with enrichment + stats + charts
════════════════════════════════════════ */
export const getAdminMediators = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, approvalStatus, dateFrom, dateTo, expertise } = req.query;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    /* ── Top-level stats ── */
    const [totalMediators, activeMediators, pendingApproval, totalActiveCases] = await Promise.all([
      User.countDocuments({ role: "mediator" }),
      User.countDocuments({ role: "mediator", isActive: true }),
      User.countDocuments({ role: "mediator", approvalStatus: "pending" }),
      Case.countDocuments({ assignedNeutral: { $ne: null }, status: { $in: ACTIVE_STATUSES } }),
    ]);

    /* ── Build filter ── */
    const filter = { role: "mediator" };
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (approvalStatus && approvalStatus !== "all") {
      filter.approvalStatus = approvalStatus;
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(`${dateTo}T23:59:59`);
    }
    if (expertise) {
      const tags = expertise.split(",").filter(Boolean);
      if (tags.length > 0) filter.expertiseAreas = { $in: tags };
    }

    const total = await User.countDocuments(filter);
    const mediators = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    /* ── Per-mediator enrichment (N queries, page-limited) ── */
    const enriched = await Promise.all(
      mediators.map(async (m) => {
        const mid = m._id;
        const [totalCases, activeCases, resolvedCount] = await Promise.all([
          Case.countDocuments({ assignedNeutral: mid }),
          Case.countDocuments({ assignedNeutral: mid, status: { $in: ACTIVE_STATUSES } }),
          Case.countDocuments({ assignedNeutral: mid, status: { $in: ["Resolved","resolved","awarded"] } }),
        ]);
        return {
          ...m,
          displayId:   makeMediatorId(mid),
          totalCases,
          activeCases,
          successRate: totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0,
        };
      })
    );

    /* ── Chart: monthly mediator growth ── */
    const [mediatorGrowthRaw, topMediatorAgg] = await Promise.all([
      User.aggregate([
        { $match: { role: "mediator", createdAt: { $gte: yearStart } } },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Case.aggregate([
        { $match: { assignedNeutral: { $ne: null }, status: { $in: ["Resolved","resolved","awarded"] } } },
        { $group: { _id: "$assignedNeutral", resolvedCases: { $sum: 1 } } },
        { $sort: { resolvedCases: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const mediatorGrowth = MONTHS.map((month, i) => ({
      month,
      mediators: mediatorGrowthRaw.find((r) => r._id === i + 1)?.count || 0,
    }));

    const topIds   = topMediatorAgg.map((t) => t._id);
    const topUsers = await User.find({ _id: { $in: topIds } }).select("name avatar").lean();
    const topMediators = topMediatorAgg.map((t) => {
      const u = topUsers.find((u) => u._id.toString() === t._id.toString());
      return { _id: t._id, name: u?.name || "Unknown", avatar: u?.avatar || "", resolvedCases: t.resolvedCases };
    });

    return res.status(200).json({
      success: true,
      stats:   { totalMediators, activeMediators, pendingApproval, totalActiveCases },
      mediators: enriched,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      mediatorGrowth,
      topMediators,
    });
  } catch (err) {
    console.error("❌ getAdminMediators error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   GET /admin/mediators/:id/detail
════════════════════════════════════════ */
export const getAdminMediatorDetail = async (req, res) => {
  try {
    const mediator = await User.findOne({ _id: req.params.id, role: "mediator" })
      .select("-password")
      .lean();
    if (!mediator) return res.status(404).json({ success: false, message: "Mediator not found" });

    const mid = mediator._id;
    const [totalCases, activeCases, resolvedCount, cases] = await Promise.all([
      Case.countDocuments({ assignedNeutral: mid }),
      Case.countDocuments({ assignedNeutral: mid, status: { $in: ACTIVE_STATUSES } }),
      Case.countDocuments({ assignedNeutral: mid, status: { $in: ["Resolved","resolved","awarded"] } }),
      Case.find({ assignedNeutral: mid })
        .select("caseId caseTitle caseType status updatedAt createdAt")
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Generate presigned URLs for verification docs so admin UI can view/download them
    const verificationDocs = await Promise.all(
      (mediator.verificationDocs || []).map(async (doc) => {
        if (!doc.fileUrl) return doc;
        try {
          const signedUrl = await getPresignedUrl(doc.fileUrl, 600);
          return { ...doc, fileUrl: signedUrl };
        } catch {
          return doc; // return raw key if signing fails; frontend hides broken link gracefully
        }
      })
    );

    return res.status(200).json({
      success:  true,
      mediator: { ...mediator, displayId: makeMediatorId(mid), verificationDocs },
      stats:    {
        totalCases,
        activeCases,
        successRate: totalCases > 0 ? Math.round((resolvedCount / totalCases) * 100) : 0,
      },
      cases,
    });
  } catch (err) {
    console.error("❌ getAdminMediatorDetail error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   GET /admin/mediators/:id/assignable-cases
   Cases: adminStatus=accepted, no neutral, not terminal
════════════════════════════════════════ */
export const getMediatorAssignableCases = async (req, res) => {
  try {
    const { page = 1, limit = 5, search, caseType, dateFrom, dateTo } = req.query;

    const filter = {
      adminStatus:     "accepted",
      assignedNeutral: null,
      status:          { $nin: TERMINAL_STATUSES },
    };
    if (search) {
      filter.$or = [
        { caseTitle: { $regex: search, $options: "i" } },
        { caseId:    { $regex: search, $options: "i" } },
      ];
    }
    if (caseType && caseType !== "all") {
      const types = caseType.split(",").filter(Boolean);
      filter.caseType = types.length === 1 ? types[0] : { $in: types };
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(`${dateTo}T23:59:59`);
    }

    const total = await Case.countDocuments(filter);
    const cases = await Case.find(filter)
      .select("caseId caseTitle caseType status createdAt")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      cases,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("❌ getMediatorAssignableCases error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   PATCH /admin/mediators/:id/approve
════════════════════════════════════════ */
export const approveMediatorStatus = async (req, res) => {
  try {
    const before = await User.findOne({ _id: req.params.id, role: "mediator" }).select("approvalStatus");
    if (!before) return res.status(404).json({ success: false, message: "Mediator not found" });
    const wasAlreadyApproved = before.approvalStatus === "approved";

    const mediator = await User.findOneAndUpdate(
      { _id: req.params.id, role: "mediator" },
      { approvalStatus: "approved", approvalNote: "" },
      { new: true }
    ).select("-password");

    // Only send the approval email on an actual pending/rejected -> approved transition,
    // so re-clicking approve (or a frontend retry) never double-sends it.
    if (!wasAlreadyApproved) {
      sendMediatorApprovedEmail({ name: mediator.name, email: mediator.email }).catch(() => {});
    }

    return res.status(200).json({ success: true, message: "Mediator approved", mediator });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   PATCH /admin/mediators/:id/reject
════════════════════════════════════════ */
export const rejectMediatorStatus = async (req, res) => {
  try {
    const { reason } = req.body;
    const before = await User.findOne({ _id: req.params.id, role: "mediator" }).select("approvalStatus");
    if (!before) return res.status(404).json({ success: false, message: "Mediator not found" });
    const wasAlreadyRejected = before.approvalStatus === "rejected";

    const mediator = await User.findOneAndUpdate(
      { _id: req.params.id, role: "mediator" },
      { approvalStatus: "rejected", approvalNote: reason || "" },
      { new: true }
    ).select("-password");

    // Same idempotency guard as approve — only email on an actual transition into "rejected".
    if (!wasAlreadyRejected) {
      sendMediatorRejectedEmail({ name: mediator.name, email: mediator.email, reason: mediator.approvalNote }).catch(() => {});
    }

    return res.status(200).json({ success: true, message: "Mediator rejected", mediator });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
