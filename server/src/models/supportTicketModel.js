import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    fileName:           { type: String, required: true },
    fileUrl:            { type: String, required: true },
    fileSize:           { type: Number, default: 0 }, // bytes
    mimeType:           { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, index: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subject: { type: String, required: true, trim: true, maxlength: 200 },

    category: {
      type: String,
      enum: ["Account", "Technical", "Payment", "Meeting", "Case"],
      required: true,
    },

    description: { type: String, required: true, trim: true },

    attachments: [attachmentSchema],

    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },

    // Set by admin on resolution
    resolvedBy:  { type: String, default: "" },
    resolvedAt:  { type: Date, default: null },
    resolution:  { type: String, default: "" },

    // User-submitted rating after resolution
    rating:        { type: Number, min: 1, max: 5, default: null },
    ratingComment: { type: String, default: "" },
    ratedAt:       { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate human-readable ticketId on first save
supportTicketSchema.pre("save", function (next) {
  if (this.isNew && !this.ticketId) {
    const ts   = Date.now().toString().slice(-4);
    const rand = Math.floor(100 + Math.random() * 900);
    this.ticketId = `ST-${ts}${rand}`;
  }
  next();
});

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("SupportTicket", supportTicketSchema);
