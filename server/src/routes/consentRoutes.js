import express from "express";
import protect, { authorizeRoles } from "../middleware/authMiddleware.js";
import { recordConsent, getCaseConsents } from "../controllers/consentController.js";

const router = express.Router();

/* POST /api/consent/record — any authenticated user */
router.post("/record", protect, recordConsent);

/* GET /api/consent/case/:caseId — admin or assigned mediator */
router.get("/case/:caseId", protect, authorizeRoles(["admin", "mediator"]), getCaseConsents);

export default router;
