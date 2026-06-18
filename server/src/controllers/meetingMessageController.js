import MeetingMessage from "../models/meetingMessageModel.js";
import Meeting        from "../models/meetingModel.js";

/* ── Permission check: user must be participant/mediator/organizer ── */
const canAccessMeeting = async (userId, meetingId) => {
  const meeting = await Meeting.findById(meetingId).select(
    "organizer mediator participants caseId"
  );
  if (!meeting) return false;
  if (meeting.organizer?.toString()  === userId.toString()) return true;
  if (meeting.mediator?.toString()   === userId.toString()) return true;
  return meeting.participants.some(
    (p) => p.user?.toString() === userId.toString()
  );
};

/* ══════════════════════════════════════════════════════════════
   GET MESSAGES  GET /api/meeting-messages/meeting/:meetingId
══════════════════════════════════════════════════════════════ */
export const getMeetingMessages = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const ok = await canAccessMeeting(req.user._id, meetingId);
    if (!ok)
      return res.status(403).json({ success: false, message: "Access denied" });

    const messages = await MeetingMessage.find({ meetingId })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ success: true, messages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════
   SEND MESSAGE  POST /api/meeting-messages/meeting/:meetingId
   Body: { text }
══════════════════════════════════════════════════════════════ */
export const sendMeetingMessage = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { text }      = req.body;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message text is required" });

    const ok = await canAccessMeeting(req.user._id, meetingId);
    if (!ok)
      return res.status(403).json({ success: false, message: "Access denied" });

    const meeting = await Meeting.findById(meetingId).select("caseId");

    const msg = await MeetingMessage.create({
      meetingId,
      caseId:     meeting?.caseId,
      sender:     req.user._id,
      senderName: req.user.name || "Participant",
      text:       text.trim(),
    });

    const populated = await MeetingMessage.findById(msg._id)
      .populate("sender", "name avatar")
      .lean();

    return res.status(201).json({ success: true, message: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
