import express from "express";
import protect, { authorizeRoles } from "../middleware/authMiddleware.js";
import upload from "../middleware/supportUpload.js";
import {
  getFaqs,
  createTicket,
  getMyTickets,
  getTicketById,
  submitRating,
  resolveTicket,
  getAllTickets,
  getAdminSupportDashboard,
  getAdminSupportTicket,
} from "../controllers/supportController.js";

const router = express.Router();

const adminOrManager = [protect, authorizeRoles(["admin", "case-manager"])];

/* ── Public ── */
router.get("/faqs", getFaqs);

/* ── User routes ── */
router.post("/tickets",              protect, upload.single("attachment"), createTicket);
router.get("/tickets/my",            protect, getMyTickets);

/* keep '/tickets/all' before '/tickets/:id' so 'all' isn't treated as an id */
router.get("/tickets/all",              ...adminOrManager, getAllTickets);
router.get("/tickets/:id",           protect, getTicketById);
router.post("/tickets/:id/rate",     protect, submitRating);

/* ── Admin / Case-Manager routes ── */
router.patch("/tickets/:id/resolve",    ...adminOrManager, resolveTicket);

/* ── Admin Support Dashboard & Ticket Detail ── */
router.get("/admin/dashboard",          ...adminOrManager, getAdminSupportDashboard);
router.get("/admin/tickets/:id",        ...adminOrManager, getAdminSupportTicket);

export default router;
