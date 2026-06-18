import ChatNote from "../models/chatNoteModel.js";
import { Conversation } from "../models/chatModel.js";

/* helper — verify the requesting user is a participant */
const assertParticipant = async (conversationId, userId) => {
  const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
  if (!conv) throw Object.assign(new Error("Conversation not found or access denied"), { status: 404 });
  return conv;
};

/* GET /api/chat-notes/:conversationId */
export const getNotes = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await assertParticipant(conversationId, userId);

    const notes = await ChatNote.find({ conversationId, authorId: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notes });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/* POST /api/chat-notes */
export const createNote = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user._id;

    if (!conversationId || !content?.trim()) {
      return res.status(400).json({ success: false, message: "conversationId and content are required" });
    }

    await assertParticipant(conversationId, userId);

    const note = await ChatNote.create({ conversationId, authorId: userId, content: content.trim() });

    res.status(201).json({ success: true, note });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

/* PATCH /api/chat-notes/:noteId */
export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "content is required" });
    }

    const note = await ChatNote.findOne({ _id: noteId, authorId: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found or access denied" });
    }

    note.content = content.trim();
    await note.save();

    res.status(200).json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* DELETE /api/chat-notes/:noteId */
export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user._id;

    const note = await ChatNote.findOneAndDelete({ _id: noteId, authorId: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found or access denied" });
    }

    res.status(200).json({ success: true, message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
