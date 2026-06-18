import mongoose from "mongoose";

const chatNoteSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

chatNoteSchema.index({ conversationId: 1, authorId: 1 });

export const ChatNote = mongoose.model("ChatNote", chatNoteSchema);
export default ChatNote;
