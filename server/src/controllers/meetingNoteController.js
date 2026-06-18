import MeetingNote from "../models/meetingNoteModel.js";
import Meeting     from "../models/meetingModel.js";

/* ── Permission check ── */
const canAccessMeeting = async (userId, meetingId) => {
  const m = await Meeting.findById(meetingId).select("organizer mediator participants");
  if (!m) return false;
  if (m.organizer?.toString() === userId.toString()) return true;
  if (m.mediator?.toString()  === userId.toString()) return true;
  return m.participants.some((p) => p.user?.toString() === userId.toString());
};

/* ══════════════════════════════════════════════════════════════
   GET NOTES  GET /api/meeting-notes/meeting/:meetingId
   Returns all notes for the meeting (all participants)
══════════════════════════════════════════════════════════════ */
export const getMeetingNotes = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const ok = await canAccessMeeting(req.user._id, meetingId);
    if (!ok)
      return res.status(403).json({ success: false, message: "Access denied" });

    const notes = await MeetingNote.find({ meetingId })
      .populate("authorId", "name role")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, notes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   GET NOTES BY CASE  GET /api/meeting-notes/case/:caseId
   Used by chat→notes section to pull meeting notes for a case
══════════════════════════════════════════════════════════════ */
export const getMeetingNotesByCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const notes = await MeetingNote.find({ caseId, authorId: req.user._id })
      .populate("authorId", "name role")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, notes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   UPSERT NOTE  POST /api/meeting-notes/meeting/:meetingId
   Creates or updates the current user's note for this meeting
   Body: { content, caseId? }
══════════════════════════════════════════════════════════════ */
export const upsertMeetingNote = async (req, res) => {
  try {
    const { meetingId }         = req.params;
    const { content = "", caseId } = req.body;

    const ok = await canAccessMeeting(req.user._id, meetingId);
    if (!ok)
      return res.status(403).json({ success: false, message: "Access denied" });

    const meeting = await Meeting.findById(meetingId).select("caseId");

    const note = await MeetingNote.findOneAndUpdate(
      { meetingId, authorId: req.user._id },
      {
        $set: {
          content,
          authorName: req.user.name || "Participant",
          authorRole: req.user.role || "participant",
          caseId:     caseId || meeting?.caseId,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, note });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE NOTE  PATCH /api/meeting-notes/:noteId
   Body: { content }
══════════════════════════════════════════════════════════════ */
export const updateMeetingNote = async (req, res) => {
  try {
    const note = await MeetingNote.findById(req.params.noteId);
    if (!note)
      return res.status(404).json({ success: false, message: "Note not found" });

    if (note.authorId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Cannot edit another user's note" });

    note.content = req.body.content ?? note.content;
    await note.save();

    return res.status(200).json({ success: true, note });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
