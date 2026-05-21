// server/src/models/redirect.model.js
import mongoose from "mongoose";

const redirectSchema = new mongoose.Schema({
  source:      { type: String, required: true, unique: true, trim: true },  // e.g. /old-url
  destination: { type: String, required: true, trim: true },                 // e.g. /new-url
  statusCode:  { type: Number, enum: [301, 302, 410], default: 301 },
  hits:        { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: String, default: 'cms' },
}, { timestamps: true });

redirectSchema.index({ source: 1 });
redirectSchema.index({ isActive: 1 });

export default mongoose.model("Redirect", redirectSchema);