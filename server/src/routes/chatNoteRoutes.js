import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getNotes, createNote, updateNote, deleteNote } from "../controllers/chatNoteController.js";

const router = express.Router();

router.get("/:conversationId", protect, getNotes);
router.post("/", protect, createNote);
router.patch("/:noteId", protect, updateNote);
router.delete("/:noteId", protect, deleteNote);

export default router;
