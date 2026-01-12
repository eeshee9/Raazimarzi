import express from "express";
import { protect } from "../src/middleware/authMiddleware.js";
import { getMediatorProfile } from "../src/controllers/mediatorController.js";

const router = express.Router();

// Protected route example
router.get("/profile", protect, getMediatorProfile);

export default router;
