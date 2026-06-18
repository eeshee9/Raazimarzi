import mongoose from "mongoose";

const adminActivityLogSchema = new mongoose.Schema(
  {
    subAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["created", "permissions_updated", "disabled", "enabled", "login", "profile_updated"],
      required: true,
    },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

adminActivityLogSchema.index({ subAdmin: 1, createdAt: -1 });

export default mongoose.model("AdminActivityLog", adminActivityLogSchema);
