import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getMeetingMessages, sendMeetingMessage } from "../controllers/meetingMessageController.js";

const router = express.Router();

router.get("/meeting/:meetingId",  protect, getMeetingMessages);
router.post("/meeting/:meetingId", protect, sendMeetingMessage);

export default router;
