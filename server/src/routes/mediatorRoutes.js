import express from "express";
import protect, { authorizeRoles, gateMediatorPortal } from "../middleware/authMiddleware.js";
import {
  getDashboard,
  getMyStats, getMyCases, getMyCaseById, saveObservations,
  resolveCase, addNote, getMyMeetings, getMeetingDetailById, requestHearing,
} from "../controllers/mediatorController.js";
import {
  getResolutionDraft,
  saveResolutionDraft,
  submitResolution,
} from "../controllers/mediatorResolutionController.js";
import {
  proposeClosureMediatorAction,
} from "../controllers/closureController.js";
import { getMediatorDocFolders } from "../controllers/mediatorDocController.js";
import {
  getCaseNotesList,
  getCaseNoteDetail,
  createCaseNote,
  updateCaseNote,
} from "../controllers/caseNoteController.js";
import {
  getMediatorConversations,
  searchMediatorConversations,
  getMediatorConversationMessages,
  mediatorSendMessage,
  startMediatorConversation,
  markMediatorConvRead,
} from "../controllers/mediatorChatController.js";
import {
  getMediatorProfile,
  updateMediatorProfile,
  getMediatorDocViewUrl,
  uploadMediatorVerificationDoc,
} from "../controllers/mediatorProfileController.js";
import { uploadAvatar } from "../config/uploadConfig.js";
import documentUpload from "../middleware/documentUpload.js";
import upload from "../middleware/chatUpload.js";

const router = express.Router();
const isMediatorOrAdmin = [protect, authorizeRoles(["mediator", "admin"]), gateMediatorPortal];

/* ── Mediator Profile ───────────────────────────────────────────────────── */
// IMPORTANT: /profile/documents/:docType/url must be declared before /profile/documents/:docType
// to avoid Express treating "url" as the docType param.
router.get("/profile",                                       ...isMediatorOrAdmin, getMediatorProfile);
router.patch("/profile",                                     ...isMediatorOrAdmin, uploadAvatar.single("avatar"), updateMediatorProfile);
router.get("/profile/documents/:docType/url",                ...isMediatorOrAdmin, getMediatorDocViewUrl);
router.post("/profile/documents/:docType",                   ...isMediatorOrAdmin, documentUpload.single("file"), uploadMediatorVerificationDoc);

router.get("/dashboard",                    ...isMediatorOrAdmin, getDashboard);
router.get("/stats",                        ...isMediatorOrAdmin, getMyStats);
router.get("/cases",                        ...isMediatorOrAdmin, getMyCases);
router.get("/meetings",                     ...isMediatorOrAdmin, getMyMeetings);
router.get("/meetings/:id",                 ...isMediatorOrAdmin, getMeetingDetailById);
router.get("/cases/:id",                    ...isMediatorOrAdmin, getMyCaseById);
router.patch("/cases/:id/observations",        ...isMediatorOrAdmin, saveObservations);
router.patch("/cases/:id/resolve",             ...isMediatorOrAdmin, resolveCase);
router.post("/cases/:id/note",                 ...isMediatorOrAdmin, addNote);
router.post("/cases/:id/request-hearing",      ...isMediatorOrAdmin, requestHearing);

/* ── Resolution Draft & Submission ─────────────────────────────────────────── */
// IMPORTANT: /resolution/draft and /resolution/submit must come BEFORE /resolution
// to avoid Express treating "draft"/"submit" as sub-path params.
router.get("/cases/:id/resolution",            ...isMediatorOrAdmin, getResolutionDraft);
router.patch("/cases/:id/resolution/draft",    ...isMediatorOrAdmin, saveResolutionDraft);
router.post("/cases/:id/resolution/submit",    ...isMediatorOrAdmin, submitResolution);

/* ── Closure Proposal (mediator signals readiness; admin takes final action) ── */
router.post("/cases/:id/propose-closure",      ...isMediatorOrAdmin, proposeClosureMediatorAction);

/* ── Mediator Case Notes ─────────────────────────────────────────────────── */
// IMPORTANT: /case-notes/entry/:noteId must come BEFORE /case-notes/:caseId
// so Express doesn't treat "entry" as a caseId.
router.get("/case-notes",                    ...isMediatorOrAdmin, getCaseNotesList);
router.patch("/case-notes/entry/:noteId",    ...isMediatorOrAdmin, updateCaseNote);
router.get("/case-notes/:caseId",            ...isMediatorOrAdmin, getCaseNoteDetail);
router.post("/case-notes/:caseId",           ...isMediatorOrAdmin, createCaseNote);

/* ── Mediator Documents ─────────────────────────────────────────────────── */
// Returns assigned-case folders with doc counts.
// Individual case docs + download use the shared /api/documents/* routes,
// which already allow mediators via canAccessCase().
router.get("/documents", ...isMediatorOrAdmin, getMediatorDocFolders);

/* ── Mediator Messages ──────────────────────────────────────────────────── */
// IMPORTANT: /messages/search and /messages/start must be declared BEFORE
// /messages/:conversationId to avoid Express treating them as param routes.
router.get("/messages",                              ...isMediatorOrAdmin, getMediatorConversations);
router.get("/messages/search",                       ...isMediatorOrAdmin, searchMediatorConversations);
router.post("/messages/start",                       ...isMediatorOrAdmin, startMediatorConversation);
router.get("/messages/:conversationId",              ...isMediatorOrAdmin, getMediatorConversationMessages);
router.post("/messages/:conversationId",             ...isMediatorOrAdmin, upload.single("file"), mediatorSendMessage);
router.patch("/messages/:conversationId/read",       ...isMediatorOrAdmin, markMediatorConvRead);

export default router;