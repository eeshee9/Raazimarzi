import mongoose from "mongoose";

const meetingMessageSchema = new mongoose.Schema(
  {
    meetingId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Meeting",
      required: true,
      index:    true,
    },
    caseId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   "Case",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
    senderName: {
      type:    String,
      default: "Participant",
    },
    text: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

meetingMessageSchema.index({ meetingId: 1, createdAt: 1 });

export default mongoose.model("MeetingMessage", meetingMessageSchema);
