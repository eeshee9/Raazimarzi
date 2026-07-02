import Case from "../models/caseModel.js";
import Meeting from "../models/meetingModel.js";
import Document from "../models/documentModel.js";
import { Conversation } from "../models/chatModel.js";
import MeetingNote from "../models/meetingNoteModel.js";

/* ── Helper: build mediator case filter (handles both old + new assignment fields) ── */
const mediatorFilter = (mediatorId, extra = {}) => ({
  $or: [
    { assignedNeutral: mediatorId, neutralType: "mediator" },
    { assignedMediator: mediatorId },
  ],
  ...extra,
});

/* ════════════════════════════════════════
   DASHBOARD (aggregated view)
════════════════════════════════════════ */
export const getDashboard = async (req, res) => {
  try {
    const id  = req.user.id;
    const now = new Date();

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [
      totalCases,
      activeCases,
      resolvedCases,
      highPriorityCases,
      recentDisputes,
      todaysSchedule,
      upcomingAppointments,
      recentMessages,
    ] = await Promise.all([
      Case.countDocuments(mediatorFilter(id)),
      Case.countDocuments(mediatorFilter(id, {
        status: { $in: ["Assigned", "Hearing", "hearing", "in-progress", "mediation"] },
      })),
      Case.countDocuments(mediatorFilter(id, {
        status: { $in: ["Resolved", "resolved"] },
      })),
      Case.countDocuments(mediatorFilter(id, {
        priority: { $in: ["High", "Urgent"] },
      })),
      Case.find(mediatorFilter(id))
        .populate("respondent.userId", "name email avatar")
        .select("caseId caseTitle caseType status priority respondent updatedAt")
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
      Meeting.find({
        mediator: id,
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ["Scheduled", "Confirmed", "In Progress"] },
      })
        .populate("caseId", "caseId caseTitle")
        .select("meetingTitle meetingType startTime endTime scheduledDate locationType virtualMeeting physicalLocation caseId status")
        .sort({ startTime: 1 })
        .lean(),
      Meeting.find({
        mediator: id,
        scheduledDate: { $gt: todayEnd },
        status: { $in: ["Scheduled", "Confirmed"] },
      })
        .populate("caseId", "caseId caseTitle")
        .select("meetingTitle meetingType startTime endTime scheduledDate locationType virtualMeeting caseId status")
        .sort({ scheduledDate: 1 })
        .limit(3)
        .lean(),
      Conversation.find({ participants: id, isArchived: { $ne: true } })
        .populate("participants", "name email avatar role")
        .populate("lastMessage.sender", "name avatar")
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      summary: { totalCases, activeCases, resolvedCases, highPriorityCases },
      recentDisputes,
      todaysSchedule,
      recentMessages,
      upcomingAppointments,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   STATS
════════════════════════════════════════ */
export const getMyStats = async (req, res) => {
  try {
    const id = req.user.id;

    const [total, active, resolved, mediation, exParte, hearings] = await Promise.all([
      Case.countDocuments(mediatorFilter(id)),
      Case.countDocuments(mediatorFilter(id, { status: { $in: ["Assigned","Hearing","hearing","in-progress","mediation"] } })),
      Case.countDocuments(mediatorFilter(id, { status: { $in: ["Resolved","resolved"] } })),
      Case.countDocuments(mediatorFilter(id, { status: "mediation" })),
      Case.countDocuments(mediatorFilter(id, { isExParte: true })),
      Meeting.countDocuments({ mediator: id, status: { $in: ["Scheduled","Confirmed"] }, scheduledDate: { $gte: new Date() } }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total, active, resolved, mediation, exParte,
        upcomingHearings: hearings,
        resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   MY CASES
════════════════════════════════════════ */
export const getMyCases = async (req, res) => {
  try {
    const {
      status, caseType, page = 1, limit = 10,
      search, dateFrom, dateTo, amountMin, amountMax,
      exportAll,
    } = req.query;
    const id = req.user.id;

    const filter = mediatorFilter(id);

    if (status) {
      // Several status values exist in both Title-case and lowercase in the enum.
      // Map each filterable value to all its variants so the filter is complete.
      const STATUS_VARIANTS = {
        Resolved: ["Resolved", "resolved"],
        Closed:   ["Closed",   "closed"  ],
        Hearing:  ["Hearing",  "hearing" ],
        Rejected: ["Rejected", "rejected"],
      };
      filter.status = STATUS_VARIANTS[status]
        ? { $in: STATUS_VARIANTS[status] }
        : status;
    }
    if (caseType) filter.caseType = caseType;

    // Date range filter on createdAt
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Amount range filter on filingFee (Number field)
    if (amountMin || amountMax) {
      filter.filingFee = {};
      if (amountMin) filter.filingFee.$gte = Number(amountMin);
      if (amountMax) filter.filingFee.$lte = Number(amountMax);
    }

    // Full-text search across case ID, title, and participant name snapshots
    if (search) {
      const searchOr = [
        { caseTitle: { $regex: search, $options: "i" } },
        { caseId:    { $regex: search, $options: "i" } },
        { "petitionerDetails.fullName": { $regex: search, $options: "i" } },
        { "respondent.name":            { $regex: search, $options: "i" } },
      ];
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    }

    const isExport = exportAll === "true";
    const pageNum  = Math.max(1, parseInt(page,  10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [total, cases] = await Promise.all([
      Case.countDocuments(filter),
      Case.find(filter)
        .populate("claimant",          "name email phone avatar")
        .populate("respondent.userId", "name email phone")
        .populate("assignedNeutral",   "name email")
        .populate("assignedMediator",  "name email")
        .select(
          "caseId caseTitle caseType status priority filingFee caseValue " +
          "petitionerDetails " +
          "respondent.userId respondent.name respondent.email respondent.inviteStatus " +
          "claimant assignedNeutral assignedMediator " +
          "neutralType createdAt updatedAt"
        )
        .sort({ updatedAt: -1 })
        .skip(isExport ? 0 : (pageNum - 1) * limitNum)
        .limit(isExport ? 2000 : limitNum),
    ]);

    return res.status(200).json({ success: true, total, cases });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   GET SINGLE CASE
════════════════════════════════════════ */
export const getMyCaseById = async (req, res) => {
  try {
    const caseObj = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }))
      .populate("claimant",             "name email phone avatar gender dob address city state")
      .populate("respondent.userId",    "name email phone avatar gender dob address city state")
      .populate("assignedNeutral",      "name email avatar")
      .populate("assignedMediator",     "name email avatar")
      .populate("assignedCaseManager",  "name email avatar")
      .populate("createdBy",            "name email")
      .populate("timeline.performedBy", "name role avatar")
      .lean();

    if (!caseObj)
      return res.status(404).json({ message: "Case not found or not assigned to you" });

    // Strip fields mediators must not see
    delete caseObj.adminNote;
    if (caseObj.respondent) {
      delete caseObj.respondent.inviteToken;
      delete caseObj.respondent.responseText;
      delete caseObj.respondent.responseSubmittedAt;
    }

    const [nextSession, pastSessions, documents] = await Promise.all([
      Meeting.findOne({
        caseId:        caseObj._id,
        status:        { $in: ["Scheduled", "Confirmed"] },
        scheduledDate: { $gte: new Date() },
      })
        .sort({ scheduledDate: 1 })
        .lean(),

      Meeting.find({
        caseId: caseObj._id,
        status: { $in: ["Completed", "No Show"] },
      })
        .sort({ scheduledDate: -1 })
        .limit(20)
        .lean(),

      Document.find({
        caseId:        caseObj._id,
        accessControl: { $in: ["case-parties", "public"] },
        status:        "Approved",
      })
        .populate("uploadedBy", "name email role avatar")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Build derived timeline (chronological, next-session appended at end)
    const events = [];

    events.push({ type: "filed", label: "Case Filed", date: caseObj.createdAt });

    if (caseObj.respondent?.acceptedAt) {
      events.push({
        type:  "respondent-accepted",
        label: "Respondent Accepted Invite",
        date:  caseObj.respondent.acceptedAt,
      });
    }

    if (caseObj.assignedAt) {
      events.push({ type: "assigned", label: "Mediator Assigned", date: caseObj.assignedAt });
    }

    for (const entry of caseObj.timeline || []) {
      events.push({
        type:        "system",
        label:       entry.action,
        date:        entry.createdAt,
        note:        entry.note || "",
        performedBy: entry.performedBy,
      });
    }

    for (const session of pastSessions) {
      events.push({
        type:          "session",
        label:         session.meetingTitle || "Mediation Session",
        date:          session.scheduledDate,
        sessionStatus: session.status,
      });
    }

    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (nextSession) {
      events.push({
        type:          "next-session",
        label:         nextSession.meetingTitle || "Upcoming Session",
        date:          nextSession.scheduledDate,
        sessionStatus: nextSession.status,
        isFuture:      true,
      });
    }

    return res.status(200).json({
      success:         true,
      case:            caseObj,
      nextSession:     nextSession ?? null,
      pastSessions,
      derivedTimeline: events,
      documents,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   SAVE MEDIATOR OBSERVATIONS
════════════════════════════════════════ */
export const saveObservations = async (req, res) => {
  try {
    const { observations } = req.body;
    if (observations === undefined || observations === null)
      return res.status(400).json({ message: "observations field is required" });

    const caseObj = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }))
      .select("isLocked mediatorObservations");
    if (!caseObj)
      return res.status(404).json({ message: "Case not found or not assigned to you" });
    if (caseObj.isLocked)
      return res.status(409).json({ message: "Case is locked (formally closed) and cannot be modified" });

    const updated = await Case.findOneAndUpdate(
      mediatorFilter(req.user.id, { _id: req.params.id }),
      { $set: { mediatorObservations: String(observations) } },
      { new: true, select: "mediatorObservations" }
    );

    if (!updated)
      return res.status(404).json({ message: "Case not found or not assigned to you" });

    return res.status(200).json({
      success:              true,
      mediatorObservations: updated.mediatorObservations,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   RESOLVE CASE
════════════════════════════════════════ */
export const resolveCase = async (req, res) => {
  try {
    const { resolutionSummary, awardDocumentUrl, awardType } = req.body;
    if (!resolutionSummary)
      return res.status(400).json({ message: "Resolution summary is required" });

    const caseData = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }));
    if (!caseData)
      return res.status(404).json({ message: "Case not found or not assigned to you" });

    if (caseData.isLocked)
      return res.status(409).json({ message: "Case is locked (formally closed) and cannot be modified" });

    const allowed = ["Assigned","Hearing","hearing","in-progress","mediation"];
    if (!allowed.includes(caseData.status))
      return res.status(400).json({ message: `Cannot resolve case with status: ${caseData.status}` });

    caseData.status            = "resolved";
    caseData.resolutionSummary = resolutionSummary;
    caseData.awardDocumentUrl  = awardDocumentUrl || "";
    caseData.awardType         = awardType || "settlement";
    caseData.resolvedAt        = new Date();
    caseData.timeline.push({ action: "Case Resolved by Mediator", performedBy: req.user.id, note: resolutionSummary, isSystem: false });

    await caseData.save();
    return res.status(200).json({ success: true, message: "Case resolved successfully", case: caseData });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   ADD NOTE
════════════════════════════════════════ */
export const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ message: "Note is required" });

    const caseData = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }));
    if (!caseData)
      return res.status(404).json({ message: "Case not found or not assigned to you" });
    if (caseData.isLocked)
      return res.status(409).json({ message: "Case is locked (formally closed) and cannot be modified" });

    caseData.timeline.push({ action: "Note Added", performedBy: req.user.id, note, isSystem: false });
    await caseData.save();
    return res.status(200).json({ success: true, timeline: caseData.timeline });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   MY MEETINGS  (enhanced — today + upcoming + search)
════════════════════════════════════════ */
export const getMyMeetings = async (req, res) => {
  try {
    const { search } = req.query;
    const mediatorId = req.user.id;

    const now        = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const casePopulate = "caseId caseTitle caseType status petitionerDetails respondent";

    let searchFilter = {};
    if (search) {
      const caseMatches = await Case.find({
        ...mediatorFilter(mediatorId),
        $or: [
          { caseTitle: { $regex: search, $options: "i" } },
          { caseId:    { $regex: search, $options: "i" } },
          { "petitionerDetails.fullName": { $regex: search, $options: "i" } },
          { "respondent.name":            { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();

      const matchedCaseIds = caseMatches.map((c) => c._id);

      searchFilter = {
        $or: [
          { meetingTitle:        { $regex: search, $options: "i" } },
          { "participants.name": { $regex: search, $options: "i" } },
          { caseId:              { $in: matchedCaseIds } },
        ],
      };
    }

    const base = { mediator: mediatorId, ...searchFilter };

    const [todayMeetings, upcomingMeetings] = await Promise.all([
      Meeting.find({ ...base, scheduledDate: { $gte: todayStart, $lte: todayEnd } })
        .populate("caseId",           casePopulate)
        .populate("participants.user", "name email avatar")
        .populate("organizer",         "name email avatar")
        .sort({ startTime: 1 })
        .lean(),
      Meeting.find({ ...base, scheduledDate: { $gt: todayEnd }, status: { $nin: ["Cancelled"] } })
        .populate("caseId",           casePopulate)
        .populate("participants.user", "name email avatar")
        .populate("organizer",         "name email avatar")
        .sort({ scheduledDate: 1, startTime: 1 })
        .limit(50)
        .lean(),
    ]);

    return res.status(200).json({ success: true, todayMeetings, upcomingMeetings });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   GET SINGLE MEETING DETAIL (mediator-scoped)
════════════════════════════════════════ */
export const getMeetingDetailById = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, mediator: req.user.id })
      .populate("caseId", "caseId caseTitle caseType status petitionerDetails respondent defendantDetails claimant")
      .populate("participants.user", "name email avatar")
      .populate("organizer", "name email avatar")
      .lean();

    if (!meeting)
      return res.status(404).json({ success: false, message: "Meeting not found or not assigned to you" });

    const myNote = await MeetingNote.findOne({
      meetingId: req.params.id,
      authorId:  req.user.id,
    }).lean();

    return res.status(200).json({ success: true, meeting, myNote: myNote || null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ════════════════════════════════════════
   REQUEST HEARING
════════════════════════════════════════ */
export const requestHearing = async (req, res) => {
  try {
    const { proposedDate, proposedTime, reason } = req.body;
    if (!proposedDate)
      return res.status(400).json({ message: "Proposed date is required" });

    const caseData = await Case.findOne(mediatorFilter(req.user.id, { _id: req.params.id }));
    if (!caseData)
      return res.status(404).json({ message: "Case not found or not assigned to you" });
    if (caseData.isLocked)
      return res.status(409).json({ message: "Case is locked (formally closed) and cannot be modified" });

    caseData.timeline.push({
      action:      "Hearing Requested by Mediator",
      performedBy: req.user.id,
      note:        `Proposed: ${proposedDate} ${proposedTime || ""}. Reason: ${reason || "N/A"}`,
      isSystem:    false,
    });

    await caseData.save();
    return res.status(200).json({ success: true, message: "Hearing request submitted to admin" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};