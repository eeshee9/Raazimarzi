// server/src/scripts/createCmsUser.js
// Run ONCE to create SEO team login
// Command (from server/ folder): node src/scripts/createCmsUser.js

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt   from "bcryptjs";
import CmsUser  from "../models/cmsUserModel.js";

// ── CHANGE THESE VALUES ───────────────────────────────────────
const NAME     = "SEO Manager";
const EMAIL    = "seo@raazimarzi.com";
const PASSWORD = "RaaziSEO@2024!";     // change to a strong password
const ROLE     = "seo_manager";         // seo_manager | content_editor | admin
// ─────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const exists = await CmsUser.findOne({ email: EMAIL });
  if (exists) {
    console.log("✗ User already exists:", EMAIL);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await CmsUser.create({ name: NAME, email: EMAIL, passwordHash, role: ROLE });

  console.log("✓ CMS user created!");
  console.log("  Email:", EMAIL);
  console.log("  Role: ", ROLE);
  console.log("  Login: https://raazimarzi.com/cms/login");
  process.exit(0);
}

run().catch(err => { console.error("Error:", err.message); process.exit(1); });