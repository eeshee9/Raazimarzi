import SupportTicket from "../models/supportTicketModel.js";
import User from "../models/userModel.js";
import Case from "../models/caseModel.js";

// ─── Static FAQ list (served by API so JSX stays clean) ───────────────────────
const FAQS = [
  {
    id: 1,
    question: "How do I file a case?",
    answer:
      "Navigate to the 'Case Files' section in your dashboard and click the 'New Case' button to start the guided filing process.",
  },
  {
    id: 2,
    question: "How do I upload documents?",
    answer:
      "Go to the Documents section, select your case folder, and use the Upload button to add PDF, JPG, or PNG files. Each file can be up to 10 MB.",
  },
  {
    id: 3,
    question: "How do I make a payment?",
    answer:
      "Navigate to the Payments section from the left sidebar. Add a payment method (UPI, card, or bank account) and view your pending payment requests from there.",
  },
  {
    id: 4,
    question: "How do I join a mediation session?",
    answer:
      "Go to the Meetings section to see your scheduled sessions. Click 'Join' when the session is active. Ensure you have a stable internet connection and your camera/microphone are enabled.",
  },
  {
    id: 5,
    question: "How do I contact support?",
    answer:
      "You can reach our support team at support@raazimarzi.com or call +91 98765 43210 (Mon–Fri, 9 AM – 6 PM). You can also submit a support ticket on this page.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   1. GET FAQS
   GET /api/support/faqs — public
═══════════════════════════════════════════════════════════════ */
export const getFaqs = async (req, res) => {
  return res.status(200).json({ success: true, faqs: FAQS });
};

/* ═══════════════════════════════════════════════════════════════
   2. CREATE TICKET
   POST /api/support/tickets
   Body: subject, category, description (multipart/form-data)
   File: attachment (optional, single)
═══════════════════════════════════════════════════════════════ */
export const createTicket = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, category, description } = req.body;

    if (!subject?.trim())
      return res.status(400).json({ success: false, message: "Subject is required" });
    if (!category)
      return res.status(400).json({ success: false, message: "Category is required" });
    if (!description?.trim())
      return res.status(400).json({ success: false, message: "Description is required" });

    const VALID_CATEGORIES = ["Account", "Technical", "Payment", "Meeting", "Case"];
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    const attachments = [];
    if (req.file) {
      attachments.push({
        fileName:           req.file.originalname,
        fileUrl:            req.file.path,
        fileSize:           req.file.size || 0,
        mimeType:           req.file.mimetype || "",
        cloudinaryPublicId: req.file.filename || "",
      });
    }

    const ticket = await SupportTicket.create({
      userId,
      subject:     subject.trim(),
      category,
      description: description.trim(),
      attachments,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully",
      ticket: {
        _id:       ticket._id,
        ticketId:  ticket.ticketId,
        subject:   ticket.subject,
        category:  ticket.category,
        status:    ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err) {
    console.error("createTicket error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   3. GET MY TICKETS
   GET /api/support/tickets/my?status=&category=&page=&limit=
═══════════════════════════════════════════════════════════════ */
export const getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, category, page = 1, limit = 5 } = req.query;

    const filter = { userId };
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;

    const total = await SupportTicket.countDocuments(filter);
    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-attachments -description -resolution -ratingComment")
      .lean();

    return res.status(200).json({ success: true, total, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   4. GET TICKET BY ID (full detail)
   GET /api/support/tickets/:id
═══════════════════════════════════════════════════════════════ */
export const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    }).lean();

    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    return res.status(200).json({ success: true, ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. SUBMIT RATING
   POST /api/support/tickets/:id/rate
   Body: { rating: 1-5, comment? }
═══════════════════════════════════════════════════════════════ */
export const submitRating = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res
        .status(400)
        .json({ success: false, message: "Rating must be between 1 and 5" });

    const ticket = await SupportTicket.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    if (ticket.status !== "resolved")
      return res
        .status(400)
        .json({ success: false, message: "Can only rate resolved tickets" });

    if (ticket.rating !== null)
      return res
        .status(400)
        .json({ success: false, message: "Rating already submitted" });

    ticket.rating        = Number(rating);
    ticket.ratingComment = comment?.trim() || "";
    ticket.ratedAt       = new Date();
    await ticket.save();

    return res
      .status(200)
      .json({ success: true, message: "Rating submitted. Thank you for your feedback!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   6. RESOLVE TICKET — admin / case-manager
   PATCH /api/support/tickets/:id/resolve
   Body: { resolution }
═══════════════════════════════════════════════════════════════ */
export const resolveTicket = async (req, res) => {
  try {
    const { resolution } = req.body;
    if (!resolution?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Resolution text is required" });

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    ticket.status     = "resolved";
    ticket.resolution = resolution.trim();
    ticket.resolvedBy = req.user?.name || "Support Team";
    ticket.resolvedAt = new Date();
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket resolved",
      ticket,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   7. GET ALL TICKETS — admin
   GET /api/support/tickets/all?status=&category=&page=&limit=
═══════════════════════════════════════════════════════════════ */
export const getAllTickets = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;

    const total = await SupportTicket.countDocuments(filter);
    const tickets = await SupportTicket.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({ success: true, total, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   8. ADMIN SUPPORT DASHBOARD
   GET /api/support/admin/dashboard
   Admin / case-manager only
   Query: status, category, page, limit, search
═══════════════════════════════════════════════════════════════ */
export const getAdminSupportDashboard = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10, search } = req.query;

    // ── Ticket list filter ─────────────────────────────────────
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;

    if (search) {
      const matchedUsers = await User.find({
        $or: [
          { name:  { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();
      const uids = matchedUsers.map((u) => u._id);
      filter.$or = [
        { subject:  { $regex: search, $options: "i" } },
        { ticketId: { $regex: search, $options: "i" } },
        ...(uids.length ? [{ userId: { $in: uids } }] : []),
      ];
    }

    // ── KPI stats (always from full dataset, not from current filter) ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalAll, openAll, todayOpen, resolvedForStats] = await Promise.all([
      SupportTicket.countDocuments({}),
      SupportTicket.countDocuments({ status: "open" }),
      SupportTicket.countDocuments({ status: "open", createdAt: { $gte: todayStart } }),
      SupportTicket.find({ status: "resolved", resolvedAt: { $ne: null } })
        .select("createdAt resolvedAt").lean(),
    ]);

    let avgMs = 0;
    if (resolvedForStats.length > 0) {
      const sumMs = resolvedForStats.reduce(
        (s, t) => s + (new Date(t.resolvedAt) - new Date(t.createdAt)),
        0
      );
      avgMs = Math.round(sumMs / resolvedForStats.length);
    }

    const fmtTime = (ms) => {
      if (!ms) return "N/A";
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const resolutionRate = totalAll > 0
      ? Math.round((resolvedForStats.length / totalAll) * 100)
      : 0;

    // ── Satisfaction analytics (from ticket ratings) ───────────
    const ratedTickets = await SupportTicket.find({
      status: "resolved",
      rating: { $exists: true, $ne: null },
    }).select("rating").lean();

    let ticketFeedback = { available: false };
    if (ratedTickets.length > 0) {
      const dist = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
      let sum = 0;
      for (const t of ratedTickets) {
        sum += t.rating;
        const k = String(t.rating);
        if (dist[k] !== undefined) dist[k] += 1;
      }
      ticketFeedback = {
        available: true,
        avg:  Math.round((sum / ratedTickets.length) * 10) / 10,
        count: ratedTickets.length,
        distribution: dist,
      };
    }

    // ── Paginated ticket list ──────────────────────────────────
    const total   = await SupportTicket.countDocuments(filter);
    const tickets = await SupportTicket.find(filter)
      .populate("userId", "name email role avatar")
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    return res.status(200).json({
      success: true,
      stats: {
        openTickets:            openAll,
        openToday:              todayOpen,
        avgResolutionTimeMs:    avgMs,
        avgResponseTimeLabel:   fmtTime(avgMs),
        resolutionRate,
        resolvedCount: resolvedForStats.length,
        totalCount:    totalAll,
      },
      tickets,
      total,
      pages: Math.max(1, Math.ceil(total / +limit)),
      satisfaction: {
        ticketFeedback,
        caseFeedback: { available: false },
      },
    });
  } catch (err) {
    console.error("getAdminSupportDashboard error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   9. ADMIN TICKET DETAIL
   GET /api/support/admin/tickets/:id
   Admin / case-manager only
═══════════════════════════════════════════════════════════════ */
export const getAdminSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate("userId", "name email phone role avatar")
      .lean();

    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    // Count active cases for the requester
    let activeCases = 0;
    if (ticket.userId?._id) {
      const uid = ticket.userId._id;
      activeCases = await Case.countDocuments({
        $or: [{ claimant: uid }, { "respondent.userId": uid }],
        status: { $nin: ["resolved", "awarded", "rejected", "withdrawn", "closed"] },
      });
    }

    return res.status(200).json({
      success: true,
      ticket: { ...ticket, activeCases },
    });
  } catch (err) {
    console.error("getAdminSupportTicket error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
