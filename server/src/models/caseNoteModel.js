import mongoose from "mongoose";

const caseNoteSchema = new mongoose.Schema(
  {
    caseId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Case",
      required: true,
      index:    true,
    },
    authorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    category: {
      type:    String,
      enum:    ["General", "Session Observation", "Document Flag", "Action Item"],
      default: "General",
    },
    content: {
      type:     String,
      required: true,
      trim:     true,
    },
  },
  { timestamps: true }
);

caseNoteSchema.index({ caseId: 1, authorId: 1, createdAt: -1 });

export default mongoose.model("CaseNote", caseNoteSchema);
