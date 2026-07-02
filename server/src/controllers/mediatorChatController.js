import { Conversation, Message } from "../models/chatModel.js";
import Case from "../models/caseModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

/* ─── Case filter matching either assignment field ────────────────────────── */
const mediatorCaseFilter = (mediatorId) => ({
  $or: [
    { assignedNeutral: mediatorId, neutralType: "mediator" },
    { assignedMediator: mediatorId },
  ],
});

/* ─── IDs of all parties across mediator-assigned cases ─────────────────── */
const getMediatorAllowedPartyIds = async (mediatorId) => {
  const cases = await Case.find(mediatorCaseFilter(mediatorId))
    .select("claimant respondent.userId")
    .lean();
  const ids = new Set();
  for (const c of cases) {
    if (c.claimant) ids.add(c.claimant.toString());
    if (c.respondent?.userId) ids.add(c.respondent.userId.toString());
  }
  return ids;
};

/* ─── IDs of all admin users ─────────────────────────────────────────────── */
const getAdminIds = async () => {
  const admins = await User.find({ role: "admin" }).select("_id").lean();
  return new Set(admins.map((a) => a._id.toString()));
};

/* ─── Check every non-mediator participant is admin or assigned party ──────── */
const canMediatorAccessConv = async (mediatorId, conv) => {
  const mediatorStr = mediatorId.toString();
  const participants = (conv.participants || []).map((p) =>
    (p._id || p).toString()
  );
  if (!participants.includes(mediatorStr)) return false;

  const [allowedParties, adminIds] = await Promise.all([
    getMediatorAllowedPartyIds(mediatorId),
    getAdminIds(),
  ]);

  for (const p of participants) {
    if (p === mediatorStr) continue;
    if (!allowedParties.has(p) && !adminIds.has(p)) return false;
  }
  return true;
};

/* ─── Shape a conversation doc for list responses ───────────────────────── */
const shapeConv = (conv, mediatorStr) => {
  const other = conv.participants?.find(
    (p) => (p._id || p).toString() !== mediatorStr
  );
  const unreadCount =
    conv.unreadCount instanceof Map
      ? conv.unreadCount.get(mediatorStr) || 0
      : conv.unreadCount?.[mediatorStr] || 0;
  return {
    _id: conv._id,
    other,
    relatedCase: conv.relatedCase,
    lastMessage: conv.lastMessage,
    unreadCount,
    isArchived: conv.isArchived,
    type: conv.type,
    updatedAt: conv.updatedAt,
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. LIST CONVERSATIONS
   GET /api/mediator/messages
═══════════════════════════════════════════════════════════════════════════ */
export const getMediatorConversations = async (req, res) => {
  try {
    const mediatorId = req.user._id;
    const mediatorStr = mediatorId.toString();

    const convs = await Conversation.find({ participants: mediatorId })
      .populate("participants", "name email avatar role")
      .populate("relatedCase", "caseId caseTitle caseType status")
      .sort({ "lastMessage.sentAt": -1 })
      .lean();

    const [allowedParties, adminIds] = await Promise.all([
      getMediatorAllowedPartyIds(mediatorId),
      getAdminIds(),
    ]);

    const allowed = convs.filter((conv) => {
      for (const p of conv.participants) {
        const pStr = (p._id || p).toString();
        if (pStr === mediatorStr) continue;
        if (!allowedParties.has(pStr) && !adminIds.has(pStr)) return false;
      }
      return true;
    });

    return res.status(200).json({
      success: true,
      conversations: allowed.map((c) => shapeConv(c, mediatorStr)),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. SEARCH CONVERSATIONS
   GET /api/mediator/messages/search?q=
   Searches case ID, party name, dispute type within allowed conversations.
   Also returns lightweight suggestions for autocomplete.
═══════════════════════════════════════════════════════════════════════════ */
export const searchMediatorConversations = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, conversations: [], suggestions: [] });
    }
    const mediatorId = req.user._id;
    const mediatorStr = mediatorId.toString();
    const regex = { $regex: q.trim(), $options: "i" };

    // Find mediator's cases matching query (for both conversation filter + suggestions)
    // Use $and to avoid the search $or overwriting the assignment $or from mediatorCaseFilter
    const matchingCases = await Case.find({
      $and: [
        mediatorCaseFilter(mediatorId),
        {
          $or: [
            { caseId: regex },
            { caseTitle: regex },
            { caseType: regex },
            { "petitionerDetails.fullName": regex },
            { "respondent.name": regex },
          ],
        },
      ],
    })
      .select("_id caseId caseTitle caseType petitionerDetails respondent claimant")
      .lean();

    const matchingCaseIds = matchingCases.map((c) => c._id);

    // Fetch ALL mediator conversations with participant population for name search
    const [allConvs, allowedParties, adminIds] = await Promise.all([
      Conversation.find({ participants: mediatorId })
        .populate("participants", "name email avatar role")
        .populate("relatedCase", "caseId caseTitle caseType status")
        .lean(),
      getMediatorAllowedPartyIds(mediatorId),
      getAdminIds(),
    ]);

    const lq = q.toLowerCase();
    const seen = new Set();
    const matched = allConvs.filter((conv) => {
      const id = conv._id.toString();
      if (seen.has(id)) return false;

      // Permission gate
      for (const p of conv.participants) {
        const pStr = (p._id || p).toString();
        if (pStr === mediatorStr) continue;
        if (!allowedParties.has(pStr) && !adminIds.has(pStr)) return false;
      }

      const byCase =
        matchingCaseIds.some((cId) => conv.relatedCase?._id?.toString() === cId.toString()) ||
        conv.relatedCase?.caseId?.toLowerCase().includes(lq) ||
        conv.relatedCase?.caseTitle?.toLowerCase().includes(lq) ||
        conv.relatedCase?.caseType?.toLowerCase().includes(lq);

      const byParticipant = conv.participants.some((p) => {
        const pStr = (p._id || p).toString();
        if (pStr === mediatorStr) return false;
        return (
          p.name?.toLowerCase().includes(lq) ||
          p.email?.toLowerCase().includes(lq)
        );
      });

      if (byCase || byParticipant) {
        seen.add(id);
        return true;
      }
      return false;
    });

    const suggestions = matchingCases.slice(0, 6).map((c) => ({
      type: "case",
      caseId: c.caseId,
      caseTitle: c.caseTitle,
      caseType: c.caseType,
      partyName: c.petitionerDetails?.fullName || c.respondent?.name || "",
      caseObjectId: c._id,
    }));

    return res.status(200).json({
      success: true,
      conversations: matched.map((c) => shapeConv(c, mediatorStr)),
      suggestions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. GET THREAD MESSAGES
   GET /api/mediator/messages/:conversationId
═══════════════════════════════════════════════════════════════════════════ */
export const getMediatorConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const mediatorId = req.user._id;
    const { page = 1, limit = 60 } = req.query;

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: mediatorId,
    })
      .populate("participants", "name email avatar role")
      .populate("relatedCase", "caseId caseTitle caseType status")
      .lean();

    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    const accessible = await canMediatorAccessConv(mediatorId, conv);
    if (!accessible) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await Message.find({
      conversationId,
      isDeleted: { $ne: true },
      deletedFor: { $ne: mediatorId },
    })
      .populate("sender", "name email avatar role")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      conversation: conv,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   4. SEND MESSAGE
   POST /api/mediator/messages/:conversationId
═══════════════════════════════════════════════════════════════════════════ */
export const mediatorSendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const mediatorId = req.user._id;
    const mediatorStr = mediatorId.toString();

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: mediatorId,
    });

    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    const accessible = await canMediatorAccessConv(mediatorId, conv);
    if (!accessible) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    let attachment = null;
    if (req.file) {
      attachment = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/chat/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      };
    }

    const message = await Message.create({
      conversationId,
      sender: mediatorId,
      content: content.trim(),
      messageType: attachment ? "file" : "text",
      attachment,
      status: "sent",
    });

    conv.lastMessage = { text: content.trim(), sender: mediatorId, sentAt: new Date() };
    for (const pId of conv.participants) {
      const pStr = pId.toString();
      if (pStr !== mediatorStr) {
        conv.unreadCount.set(pStr, (conv.unreadCount.get(pStr) || 0) + 1);
      }
    }
    await conv.save();

    const populated = await Message.findById(message._id)
      .populate("sender", "name email avatar role")
      .lean();

    if (req.io) {
      const payload = { conversationId, message: populated };
      req.io.to(conversationId).emit("new-message", payload);
      for (const pId of conv.participants) {
        const pStr = pId.toString();
        if (pStr !== mediatorStr) req.io.to(pStr).emit("new-message", payload);
      }
    }

    return res.status(201).json({ success: true, message: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   5. START / FIND CONVERSATION
   POST /api/mediator/messages/start
   Body: { targetUserId, caseId? }
   Creates or returns existing allowed conversation.

   Permission rules enforced:
   A. Mediator ↔ admin  → always allowed
   B. Mediator ↔ party  → only if party belongs to mediator-assigned case
   C. Anything else     → 403
═══════════════════════════════════════════════════════════════════════════ */
export const startMediatorConversation = async (req, res) => {
  try {
    const { targetUserId, caseId } = req.body;
    const mediatorId = req.user._id;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "targetUserId is required" });
    }

    const targetStr = targetUserId.toString();
    const [allowedParties, adminIds] = await Promise.all([
      getMediatorAllowedPartyIds(mediatorId),
      getAdminIds(),
    ]);

    if (!allowedParties.has(targetStr) && !adminIds.has(targetStr)) {
      return res.status(403).json({
        success: false,
        message: "Not permitted: target user is not an admin or assigned case party",
      });
    }

    const convType = adminIds.has(targetStr) ? "user-admin" : "user-mediator";
    const sorted = [mediatorId.toString(), targetStr].sort();

    let conv = await Conversation.findOne({
      participants: { $all: sorted.map((id) => new mongoose.Types.ObjectId(id)), $size: 2 },
    })
      .populate("participants", "name email avatar role")
      .populate("relatedCase", "caseId caseTitle caseType status");

    if (!conv) {
      conv = await Conversation.create({
        participants: sorted.map((id) => new mongoose.Types.ObjectId(id)),
        relatedCase: caseId ? new mongoose.Types.ObjectId(caseId) : null,
        type: convType,
        unreadCount: new Map(sorted.map((id) => [id, 0])),
      });
      conv = await Conversation.findById(conv._id)
        .populate("participants", "name email avatar role")
        .populate("relatedCase", "caseId caseTitle caseType status");
    }

    return res.status(200).json({ success: true, conversation: conv });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   6. MARK CONVERSATION AS READ
   PATCH /api/mediator/messages/:conversationId/read
═══════════════════════════════════════════════════════════════════════════ */
export const markMediatorConvRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const mediatorId = req.user._id;
    const mediatorStr = mediatorId.toString();

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: mediatorId,
    });

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    conv.unreadCount.set(mediatorStr, 0);
    await conv.save();

    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: mediatorId },
        "readBy.userId": { $ne: mediatorId },
      },
      {
        $push: { readBy: { userId: mediatorId, readAt: new Date() } },
        $set: { status: "read" },
      }
    );

    if (req.io) {
      const others = conv.participants.filter((p) => p.toString() !== mediatorStr);
      for (const p of others) {
        req.io.to(p.toString()).emit("messages-read", {
          conversationId,
          readBy: mediatorId,
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
