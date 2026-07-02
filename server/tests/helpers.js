import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

/* Fixed ObjectId used as default createdBy for seeded cases.
   Does not need to reference a real User — Mongoose does not
   validate foreign-key integrity unless you populate with strict refs. */
const STUB_CREATOR_ID = new mongoose.Types.ObjectId();
import jwt from "jsonwebtoken";
import express from "express";
import User from "../src/models/userModel.js";
import Case from "../src/models/caseModel.js";

let mongod;

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearDb() {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
}

export function makeToken(userId) {
  return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

let _userSeq = 0;
export async function seedUser(role, extra = {}) {
  _userSeq++;
  const user = await User.create({
    name:     `Test ${role} ${_userSeq}`,
    email:    `${role}${_userSeq}@test.internal`,
    password: "notused",
    role,
    isActive: true,
    ...(role === "mediator" ? { approvalStatus: "approved" } : {}),
    ...extra,
  });
  return { user, token: makeToken(user._id) };
}

let _caseSeq = 0;
export async function seedCase(extra = {}) {
  _caseSeq++;
  return Case.create({
    caseId:    `TST-${_caseSeq}-${Date.now()}`,
    caseTitle: "Test Dispute",
    status:    "in-progress",
    isLocked:  false,
    createdBy: STUB_CREATOR_ID,
    petitionerDetails: { fullName: "Claimant Test" },
    defendantDetails:  { fullName: "Respondent Test" },
    ...extra,
  });
}

export function makeApp(...routePairs) {
  const app = express();
  app.use(express.json());
  for (const [prefix, router] of routePairs) {
    app.use(prefix, router);
  }
  return app;
}
