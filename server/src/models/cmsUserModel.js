// server/src/models/cmsUser.model.js
import mongoose from "mongoose";
import bcrypt   from "bcryptjs";

const cmsUserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ["seo_manager","content_editor","admin"], default: "content_editor" },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

cmsUserSchema.index({ email: 1 });

cmsUserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model("CmsUser", cmsUserSchema);