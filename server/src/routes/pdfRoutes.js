import express from "express";
import protect, { authorizeRoles, gateMediatorPortal } from "../middleware/authMiddleware.js";
import {
  downloadAwardPDF,
  previewAwardPDF,
  verifyAward,
  generateCertificate,
  verifyCertificate,
} from "../controllers/pdfController.js";

const router = express.Router();

const adminOrNeutral = [protect, authorizeRoles(["admin","arbitrator","mediator"]), gateMediatorPortal];

/* ── Award PDF ── */
router.get("/award/:caseId",          ...adminOrNeutral, downloadAwardPDF);   // GET  /api/pdf/award/:caseId
router.get("/award/:caseId/preview",  ...adminOrNeutral, previewAwardPDF);    // GET  /api/pdf/award/:caseId/preview

/* ── Certificate ── */
router.post("/certificate/:caseId",   ...adminOrNeutral, generateCertificate);// POST /api/pdf/certificate/:caseId

/* ── Public verification (no auth) — QR code scans ── */
router.get("/verify/:awardRef",       verifyAward);                           // GET  /api/pdf/verify/:awardRef
router.get("/verify-cert/:certRef",   verifyCertificate);                     // GET  /api/pdf/verify-cert/:certRef

export default router;