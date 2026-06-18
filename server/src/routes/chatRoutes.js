import express from "express";
import protect, { authorizeRoles } from "../middleware/authMiddleware.js";
import upload from "../middleware/chatUpload.js";
import {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  searchMessages,
  deleteMessage,
  editMessage,
  updateTypingStatus,
  getAdminConversations,
  getAllConversationsAdmin,
  getAdminConversationDetail,
  getAdminConversationMessages,
  adminSendToConversation,
  archiveConversation,
  markAdminRead,
} from "../controllers/chatController.js";

const router = express.Router();

/* ═══════════════════════════════════════════════════════════════
   USER ROUTES
═══════════════════════════════════════════════════════════════ */

// Get all conversations for logged-in user
router.get("/conversations", protect, getConversations);

// Get messages in a specific conversation
router.get("/conversations/:conversationId/messages", protect, getMessages);

// Send message (with optional file upload)
router.post(
  "/messages",
  protect,
  upload.single("file"), // field name for file uploads
  sendMessage
);

// Mark messages as read in a conversation
router.patch("/conversations/:conversationId/read", protect, markAsRead);

// Search messages
router.get("/search", protect, searchMessages);

// Delete message
router.delete("/messages/:messageId", protect, deleteMessage);

// Edit message
router.patch("/messages/:messageId", protect, editMessage);

// Update typing status
router.post("/typing", protect, updateTypingStatus);

/* ═══════════════════════════════════════════════════════════════
   ADMIN ROUTES
═══════════════════════════════════════════════════════════════ */

const adminOrCM = [protect, authorizeRoles(["admin", "case-manager"])];

// Legacy: admin conversations (admin-participated only)
router.get("/admin/conversations", protect, authorizeRoles(["admin"]), getAdminConversations);

// Admin Messages module — all platform conversations
router.get("/admin/all", ...adminOrCM, getAllConversationsAdmin);
router.get("/admin/conversations/:id/detail", ...adminOrCM, getAdminConversationDetail);
router.get("/admin/conversations/:id/messages", ...adminOrCM, getAdminConversationMessages);
router.post("/admin/conversations/:id/messages", ...adminOrCM, upload.single("file"), adminSendToConversation);
router.patch("/admin/conversations/:id/archive", ...adminOrCM, archiveConversation);
router.patch("/admin/conversations/:id/read", ...adminOrCM, markAdminRead);

export default router;