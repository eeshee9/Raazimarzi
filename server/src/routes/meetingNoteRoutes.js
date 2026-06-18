import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getMeetingNotes,
  getMeetingNotesByCase,
  upsertMeetingNote,
  updateMeetingNote,
} from "../controllers/meetingNoteController.js";

const router = express.Router();

router.get("/meeting/:meetingId",  protect, getMeetingNotes);
router.get("/case/:caseId",        protect, getMeetingNotesByCase);
router.post("/meeting/:meetingId", protect, upsertMeetingNote);
router.patch("/:noteId",           protect, updateMeetingNote);

export default router;
