import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    phone: { type: String },

    password: {
      type: String,
      required: false, // ✅ required only after password set
    },

    role: {
      type: String,
      enum: ["user", "admin", "mediator", "case_manager"],
      default: "user",
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
