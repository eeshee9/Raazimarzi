import Case from "../models/caseModel.js";
import Meeting from "../models/meetingModel.js";
import Document from "../models/documentModel.js";
import User from "../models/userModel.js";
import { Conversation, Message } from "../models/chatModel.js";
import mongoose from "mongoose";

export const getUserDashboardData = async (req, res) => {
  try {
    const userId    = req.user.id;
    const userEmail = req.user.email;

    /* ── 1. Current user info ── */
    const currentUser = await User.findById(userId).select("name email avatar").lean();
    const userName = currentUser?.name || req.user.name || "User";

    /* ── 2. Cases filed BY this user ── */
    const raisedCases = await Case.find({
      $or: [{ createdBy: userId }, { claimant: userId }],
    })
      .populate("assignedNeutral", "name avatar")
      .populate("assignedMediator", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    /* ── 3. Cases filed AGAINST this user ── */
    const opponentCases = await Case.find({
      $or: [
        { "respondent.userId":      userId },
        { "respondent.email":       userEmail?.toLowerCase() },
        { "defendantDetails.email": userEmail },
      ],
      $and: [
        { createdBy: { $ne: userId } },
        { claimant:  { $ne: userId } },
      ],
    })
      .populate("claimant", "name avatar")
      .populate("createdBy", "name avatar")
      .populate("assignedNeutral", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    const allCases = [...raisedCases, ...opponentCases];

    /* ── 4. Stats ── */
    const activeCases = allCases.filter((c) =>
      ["in-progress","Assigned","notice-sent","mediation","arbitration","Hearing","hearing","In Review"].includes(c.status)
    ).length;

    const resolvedCases = allCases.filter((c) =>
      ["Resolved","resolved","awarded"].includes(c.status)
    ).length;

    const pendingCases = allCases.filter((c) =>
      ["Pending","pending","pending-review"].includes(c.status)
    ).length;

    const totalCases = allCases.length;

    const latestActiveCase = allCases.find((c) =>
      ["in-progress","mediation","arbitration","Hearing","hearing"].includes(c.status)
    );

    /* ── 5. Upcoming meetings ── */
    const now = new Date();
    let upcomingMeetings = [];
    let todayMeeting     = null;

    try {
      const meetingFilter = {
        $or: [
          { organizer: userId },
          { mediator: userId },
          { "participants.user": userId },
        ],
        scheduledDate: { $gte: now },
        status: { $nin: ["cancelled", "Cancelled"] },
      };

      upcomingMeetings = await Meeting.find(meetingFilter)
        .sort({ scheduledDate: 1 })
        .limit(5)
        .populate("caseId", "caseId caseTitle")
        .lean();

      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

      todayMeeting = await Meeting.findOne({
        $or: [
          { organizer: userId },
          { mediator: userId },
          { "participants.user": userId },
        ],
        scheduledDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["cancelled", "Cancelled"] },
      })
        .populate("caseId", "caseId caseTitle defendantDetails petitionerDetails")
        .lean();
    } catch (meetingErr) {
      console.warn("⚠️ Meeting query failed:", meetingErr.message);
    }

    /* ── 6. Documents ── */
    let totalDocs    = 0;
    let approvedDocs = 0;
    let recentDocs   = [];

    if (allCases.length > 0) {
      try {
        const caseIds = allCases
          .map((c) => c._id)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id.toString()));

        if (caseIds.length > 0) {
          totalDocs    = await Document.countDocuments({ caseId: { $in: caseIds } });
          approvedDocs = await Document.countDocuments({ caseId: { $in: caseIds }, status: "approved" });
          recentDocs   = await Document.find({ caseId: { $in: caseIds } })
            .select("documentTitle status createdAt")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        }
      } catch (docErr) {
        console.warn("⚠️ Document query failed:", docErr.message);
      }
    }

    const docProgress = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

    /* ── 7. Recent messages (conversations) ── */
    let recentMessages = [];
    try {
      const conversations = await Conversation.find({
        participants: userId,
      })
        .populate("participants", "name avatar")
        .sort({ "lastMessage.sentAt": -1 })
        .limit(3)
        .lean();

      recentMessages = conversations.map((conv) => {
        const other = conv.participants?.find(
          (p) => p._id?.toString() !== userId.toString()
        );
        return {
          _id:       conv._id,
          sender:    other?.name || "Unknown",
          avatar:    other?.avatar || null,
          preview:   conv.lastMessage?.text || "No messages yet",
          createdAt: conv.lastMessage?.sentAt || conv.updatedAt,
          unread:    conv.unreadCount?.get?.(userId.toString()) || 0,
        };
      });
    } catch (chatErr) {
      console.warn("⚠️ Chat query failed:", chatErr.message);
    }

    /* ── 8. Pending actions ── */
    const actions = [];

    // Action: document pending upload (cases with no documents)
    const caseIdsWithDocs = new Set();
    if (allCases.length > 0) {
      try {
        const caseIds = allCases
          .map((c) => c._id)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id.toString()));
        if (caseIds.length > 0) {
          const docsWithCases = await Document.distinct("caseId", { caseId: { $in: caseIds } });
          docsWithCases.forEach((id) => caseIdsWithDocs.add(id.toString()));
        }
      } catch (_) {}
    }

    // Action: upload ID proof if any active case has no docs
    const casesNeedingDocs = raisedCases.filter(
      (c) => !caseIdsWithDocs.has(c._id.toString()) && !["Resolved","resolved","awarded","closed","withdrawn"].includes(c.status)
    );
    if (casesNeedingDocs.length > 0) {
      actions.push({
        type:        "document",
        description: `Upload ID Proof for Case ${casesNeedingDocs[0].caseId || ""}`,
        caseId:      casesNeedingDocs[0]._id,
        link:        `/user/documents`,
      });
    }

    // Action: respond to latest message if unread
    if (recentMessages.length > 0 && recentMessages[0].unread > 0) {
      const latestUnread = recentMessages.find((m) => m.unread > 0);
      if (latestUnread) {
        actions.push({
          type:        "message",
          description: `Respond to ${latestUnread.sender}'s latest message`,
          link:        `/user/chats`,
        });
      }
    }

    /* ── 9. Format cases for table ── */
    const formattedCases = allCases.slice(0, 10).map((c) => {
      const neutral  = c.assignedNeutral || c.assignedMediator;
      const isRaised = raisedCases.some((r) => r._id.toString() === c._id.toString());

      return {
        id:             c.caseId,
        _id:            c._id,
        title:          c.caseTitle,
        party1:         c.petitionerDetails?.fullName || "—",
        party2:         c.defendantDetails?.fullName  || c.respondent?.name || "—",
        category:       c.caseType    || "General",
        mediator:       neutral?.name || "—",
        mediatorAvatar: neutral?.avatar || null,
        status:         c.status,
        adminStatus:    c.adminStatus,
        role:           isRaised ? "claimant" : "respondent",
        filedOn:        c.createdAt,
        updatedAt:      c.updatedAt,
      };
    });

    /* ── 10. Format meetings ── */
    const formattedMeetings = upcomingMeetings.map((m) => ({
      id:     m._id,
      date:   m.scheduledDate,
      time:   m.startTime || "",
      title:  m.caseId?.caseTitle || m.meetingTitle || "Meeting",
      caseId: m.caseId?.caseId   || "",
      link:   m.virtualMeeting?.meetingLink || m.meetingLink || "",
    }));

    /* ── 11. Format today reminder ── */
    const todayReminder = todayMeeting
      ? {
          id:       todayMeeting._id,
          date:     todayMeeting.scheduledDate,
          time:     todayMeeting.startTime || "",
          caseId:   todayMeeting.caseId?.caseId   || "",
          title:    todayMeeting.caseId?.caseTitle || "Meeting",
          opponent: todayMeeting.caseId?.defendantDetails?.fullName ||
                    todayMeeting.caseId?.petitionerDetails?.fullName || "—",
          link:     todayMeeting.virtualMeeting?.meetingLink || todayMeeting.meetingLink || "",
        }
      : null;

    return res.status(200).json({
      success: true,
      userName,
      stats: {
        total:    totalCases,
        active:   activeCases,
        resolved: resolvedCases,
        pending:  pendingCases,
        current:  activeCases,
      },
      cases:         formattedCases,
      raisedCases:   raisedCases.length,
      opponentCases: opponentCases.length,
      meetings:      formattedMeetings,
      messages:      recentMessages,
      actions,
      todayReminder,
      documents: {
        total:    totalDocs,
        approved: approvedDocs,
        progress: docProgress,
        recent:   recentDocs,
      },
    });
  } catch (error) {
    console.error("❌ getUserDashboardData error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
