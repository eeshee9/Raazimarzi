// server/src/scripts/fixCaseTypes.js
// One-off data migration: normalizes legacy/garbage Case.caseType values to the
// valid enum ["property", "rental", "consumer", "individual", "commercial"].
// Command: node src/scripts/fixCaseTypes.js

import "dotenv/config";
import mongoose from "mongoose";
import Case from "../models/caseModel.js";
import { VALID_CASE_TYPES, normalizeCaseType } from "../utils/normalizeCaseType.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const badCases = await Case.find({ caseType: { $nin: VALID_CASE_TYPES } }).select("_id caseId caseType");

let updated = 0;
const unmapped = [];

for (const c of badCases) {
  const mapped = normalizeCaseType(c.caseType);
  if (mapped) {
    await Case.updateOne({ _id: c._id }, { $set: { caseType: mapped } });
    console.log(`  ${c.caseId}: "${c.caseType}" → "${mapped}"`);
    updated++;
  } else {
    unmapped.push({ caseId: c.caseId, caseType: c.caseType });
  }
}

console.log("\n── Summary ──────────────────────────────");
console.log(`Updated:   ${updated}`);
console.log(`Unmapped:  ${unmapped.length}`);
if (unmapped.length) {
  console.log("Needs manual cleanup:");
  unmapped.forEach((u) => console.log(`  ${u.caseId}: "${u.caseType}"`));
}

await mongoose.disconnect();
