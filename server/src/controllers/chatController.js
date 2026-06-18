import { Conversation, Message, TypingIndicator } from "../models/chatModel.js";
import User from "../models/userModel.js";
import Document from "../models/documentModel.js";
import mongoose from "mongoose";

/* ═══════════════════════════════════════════════════════════════
   HELPER: Find or create conversation between users
═══════════════════════════════════════════════════════════════ */
const findOrCreateConversation = async (participant1Id, participant2Id, caseId = null) => {
  // Sort participants to ensure consistent ordering
  const participants = [participant1Id, participant2Id].sort();

  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  }).populate("participants", "name email avatar role");

  if (!conversation) {
    conversation = await Conversation.create({
      participants,
      relatedCase: caseId,
      type: "user-admin",
      unreadCount: new Map([
        [participant1Id.toString(), 0],
        [participant2Id.toString(), 0],
      ]),
    });

    conversation = await Conversation.findById(conversation._id).populate(
      "participants",
      "name email avatar role"
    );
  }

  return conversation;
};

/* ═══════════════════════════════════════════════════════════════
   1. SEND MESSAGE
═══════════════════════════════════════════════════════════════ */
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType, replyToId, caseId } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !content) {
      return res.status(400).json({
        success: false,
        message: "Receiver and content are required",
      });
    }

    // ✅ Find or create conversation
    const conversation = await findOrCreateConversation(
      senderId,
      receiverId,
      caseId
    );

    // ✅ Handle file attachment if present
    let attachment = null;
    if (req.file) {
      attachment = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/chat/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      };
    }

    // ✅ Create message
    const message = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      content,
      messageType: messageType || (attachment ? "file" : "text"),
      attachment,
      replyTo: replyToId || null,
      status: "sent",
    });

    // ✅ Update conversation's last message
    conversation.lastMessage = {
      text: content,
      sender: senderId,
      sentAt: new Date(),
    };

    // ✅ Increment unread count for receiver
    const receiverIdStr = receiverId.toString();
    const currentUnread = conversation.unreadCount.get(receiverIdStr) || 0;
    conversation.unreadCount.set(receiverIdStr, currentUnread + 1);

    await conversation.save();

    // ✅ Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email avatar")
      .populate("replyTo");

    // ✅ Emit socket event — receiver's private room + conversation room
    if (req.io) {
      const payload = { conversationId: conversation._id, message: populatedMessage };
      req.io.to(receiverIdStr).emit("new-message", payload);
      req.io.to(conversation._id.toString()).emit("new-message", payload);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
      conversation,
    });
  } catch (error) {
    console.error("❌ Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   2. GET CONVERSATIONS (Chat List)
═══════════════════════════════════════════════════════════════ */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
      isArchived: false,
    })
      .populate("participants", "name email avatar role")
      .populate("lastMessage.sender", "name avatar")
      .populate("relatedCase", "caseId caseTitle status")
      .sort({ "lastMessage.sentAt": -1 });

    // ✅ Get unread count for current user
    const conversationsWithUnread = conversations.map((conv) => {
      const unreadCount = conv.unreadCount.get(userId.toString()) || 0;
      return {
        ...conv.toObject(),
        unreadCount,
      };
    });

    res.status(200).json({
      success: true,
      count: conversationsWithUnread.length,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    console.error("❌ Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   3. GET MESSAGES IN A CONVERSATION
═══════════════════════════════════════════════════════════════ */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    // ✅ Verify user is part of this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // ✅ Get messages with pagination
    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId }, // Exclude messages deleted by this user
    })
      .populate("sender", "name email avatar")
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: userId },
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("❌ Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   4. MARK MESSAGES AS READ
═══════════════════════════════════════════════════════════════ */
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // ✅ Update all unread messages in this conversation
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        "readBy.userId": { $ne: userId },
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date(),
          },
        },
        $set: { status: "read" },
      }
    );

    // ✅ Reset unread count for this user
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCount.set(userId.toString(), 0);
      await conversation.save();

      // ✅ Emit socket event to notify sender
      if (req.io) {
        const otherParticipant = conversation.participants.find(
          (p) => p.toString() !== userId.toString()
        );
        req.io.to(otherParticipant.toString()).emit("messages-read", {
          conversationId,
          readBy: userId,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("❌ Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. SEARCH MESSAGES
═══════════════════════════════════════════════════════════════ */
export const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user._id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    // ✅ Find conversations user is part of
    const userConversations = await Conversation.find({
      participants: userId,
    }).select("_id");

    const conversationIds = userConversations.map((c) => c._id);

    // ✅ Search messages in user's conversations
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      content: { $regex: query, $options: "i" },
      deletedFor: { $ne: userId },
    })
      .populate("sender", "name avatar")
      .populate("conversationId", "participants")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("❌ Search messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search messages",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   6. DELETE MESSAGE
═══════════════════════════════════════════════════════════════ */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.body; // "me" or "everyone"
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (deleteFor === "everyone") {
      // Only sender can delete for everyone within 1 hour
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own messages",
        });
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return res.status(400).json({
          success: false,
          message: "Can only delete messages within 1 hour of sending",
        });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = "This message was deleted";
      await message.save();

      // Emit socket event
      if (req.io) {
        req.io.to(message.conversationId.toString()).emit("message-deleted", {
          messageId: message._id,
          deletedFor: "everyone",
        });
      }
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("❌ Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   7. EDIT MESSAGE
═══════════════════════════════════════════════════════════════ */
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit socket event
    if (req.io) {
      req.io.to(message.conversationId.toString()).emit("message-edited", {
        messageId: message._id,
        content,
        editedAt: message.editedAt,
      });
    }

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("❌ Edit message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to edit message",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   8. UPDATE TYPING STATUS
═══════════════════════════════════════════════════════════════ */
export const updateTypingStatus = async (req, res) => {
  try {
    const { conversationId, isTyping } = req.body;
    const userId = req.user._id;

    if (isTyping) {
      await TypingIndicator.findOneAndUpdate(
        { conversationId, userId },
        { isTyping: true, lastTypingTime: new Date() },
        { upsert: true }
      );
    } else {
      await TypingIndicator.deleteOne({ conversationId, userId });
    }

    // Emit socket event
    if (req.io) {
      const conversation = await Conversation.findById(conversationId);
      const otherParticipant = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );
      req.io.to(otherParticipant.toString()).emit("typing", {
        conversationId,
        userId,
        isTyping,
      });
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("❌ Update typing status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update typing status",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   9. GET ADMIN CONVERSATIONS (Admin sees all user chats)
═══════════════════════════════════════════════════════════════ */
export const getAdminConversations = async (req, res) => {
  try {
    // Find all conversations where at least one participant is admin
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email avatar role")
      .populate("lastMessage.sender", "name avatar")
      .populate("relatedCase", "caseId caseTitle status")
      .sort({ "lastMessage.sentAt": -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("❌ Get admin conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   10. GET ALL CONVERSATIONS — Admin Messages module
   GET /api/chats/admin/all?page=1&limit=25&search=
   Returns all platform conversations (not just admin-participated)
   with real adminReadState for per-admin unread computation.
═══════════════════════════════════════════════════════════════ */
export const getAllConversationsAdmin = async (req, res) => {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 25));
    const skip     = (pageNum - 1) * limitNum;

    const toPlain = (conv) => ({
      ...conv.toObject(),
      unreadCount:    Object.fromEntries(conv.unreadCount    || new Map()),
      adminReadState: Object.fromEntries(conv.adminReadState || new Map()),
    });

    if (search) {
      // Populate then filter in memory (populated fields can't be indexed in Mongo)
      const raw = await Conversation.find({})
        .populate("participants", "name email avatar role")
        .populate("lastMessage.sender", "name avatar")
        .populate("relatedCase", "caseId caseTitle status")
        .sort({ "lastMessage.sentAt": -1 })
        .limit(500);

      const q = search.toLowerCase();
      const filtered = raw.filter((c) => {
        const byParticipant = c.participants?.some(
          (p) => p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
        );
        const byCase =
          c.relatedCase?.caseId?.toLowerCase().includes(q) ||
          c.relatedCase?.caseTitle?.toLowerCase().includes(q);
        return byParticipant || byCase;
      });

      const total = filtered.length;
      const page_data = filtered.slice(skip, skip + limitNum).map(toPlain);

      return res.status(200).json({
        success: true,
        conversations: page_data,
        total,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        page: pageNum,
      });
    }

    // No search — DB-level pagination
    const [total, raw] = await Promise.all([
      Conversation.countDocuments({}),
      Conversation.find({})
        .populate("participants", "name email avatar role")
        .populate("lastMessage.sender", "name avatar")
        .populate("relatedCase", "caseId caseTitle status")
        .sort({ "lastMessage.sentAt": -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      success: true,
      conversations: raw.map(toPlain),
      total,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      page: pageNum,
    });
  } catch (error) {
    console.error("❌ getAllConversationsAdmin error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   10b. MARK ADMIN READ — persist admin's last-read timestamp
   PATCH /api/chats/admin/conversations/:id/read
═══════════════════════════════════════════════════════════════ */
export const markAdminRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    const adminId = req.user._id.toString();
    const readAt  = new Date();
    conversation.adminReadState.set(adminId, readAt);
    await conversation.save();
    res.status(200).json({ success: true, adminLastReadAt: readAt });
  } catch (error) {
    console.error("❌ markAdminRead error:", error);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   11. GET CONVERSATION DETAIL — Admin Messages right panel
   GET /api/chats/admin/conversations/:id/detail
   Returns conversation + case info + participants + recent docs
═══════════════════════════════════════════════════════════════ */
export const getAdminConversationDetail = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "name email avatar role")
      .populate({
        path: "relatedCase",
        select: "caseId caseTitle status caseFacts claimant respondent assignedCaseManager",
        populate: [
          { path: "claimant", select: "name email avatar role" },
          { path: "respondent.userId", select: "name email avatar role" },
          { path: "assignedCaseManager", select: "name email avatar role" },
        ],
      })
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    let recentDocs = [];
    if (conversation.relatedCase?._id) {
      recentDocs = await Document.find({ caseId: conversation.relatedCase._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("documentTitle category fileUrl mimeType createdAt uploadedBy")
        .populate("uploadedBy", "name")
        .lean();
    }

    res.status(200).json({ success: true, conversation, recentDocs });
  } catch (error) {
    console.error("❌ getAdminConversationDetail error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch conversation detail" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   12. GET MESSAGES (Admin — no participant check)
   GET /api/chats/admin/conversations/:id/messages
═══════════════════════════════════════════════════════════════ */
export const getAdminConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const messages = await Message.find({ conversationId: id, isDeleted: { $ne: true } })
      .populate("sender", "name email avatar role")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.status(200).json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error("❌ getAdminConversationMessages error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   13. ADMIN SEND TO CONVERSATION (by conversationId)
   POST /api/chats/admin/conversations/:id/messages
═══════════════════════════════════════════════════════════════ */
export const adminSendToConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, messageType } = req.body;
    const senderId = req.user._id;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
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
      conversationId: id,
      sender: senderId,
      content: content.trim(),
      messageType: messageType || (attachment ? "file" : "text"),
      attachment,
      status: "sent",
    });

    conversation.lastMessage = { text: content.trim(), sender: senderId, sentAt: new Date() };

    for (const participantId of conversation.participants) {
      const pStr = participantId.toString();
      if (pStr !== senderId.toString()) {
        const cur = conversation.unreadCount.get(pStr) || 0;
        conversation.unreadCount.set(pStr, cur + 1);
      }
    }
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email avatar role")
      .lean();

    if (req.io) {
      const payload = { conversationId: id, message: populatedMessage };
      req.io.to(id).emit("new-message", payload);
      for (const participantId of conversation.participants) {
        const pStr = participantId.toString();
        if (pStr !== senderId.toString()) {
          req.io.to(pStr).emit("new-message", payload);
        }
      }
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("❌ adminSendToConversation error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   14. ARCHIVE / UNARCHIVE CONVERSATION (Admin)
   PATCH /api/chats/admin/conversations/:id/archive
═══════════════════════════════════════════════════════════════ */
export const archiveConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    conversation.isArchived = !conversation.isArchived;
    await conversation.save();
    res.status(200).json({
      success: true,
      isArchived: conversation.isArchived,
      message: conversation.isArchived ? "Conversation archived" : "Conversation unarchived",
    });
  } catch (error) {
    console.error("❌ archiveConversation error:", error);
    res.status(500).json({ success: false, message: "Failed to archive conversation" });
  }
};