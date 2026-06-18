import mongoose from "mongoose";

const meetingNoteSchema = new mongoose.Schema(
  {
    meetingId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Meeting",
      required: true,
      index:    true,
    },
    // caseId stored for cross-context retrieval (e.g. chat notes section)
    caseId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   "Case",
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
    authorName: {
      type:    String,
      default: "Participant",
    },
    authorRole: {
      type:    String,
      default: "participant",
    },
    content: {
      type:    String,
      default: "",
    },
    // one note per user per meeting (upsert pattern)
  },
  { timestamps: true }
);

// Compound unique: one note per user per meeting
meetingNoteSchema.index({ meetingId: 1, authorId: 1 }, { unique: true });

export default mongoose.model("MeetingNote", meetingNoteSchema);
