import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import mongoose from "mongoose";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import pdfRoutes from "../src/routes/pdfRoutes.js";
import Case from "../src/models/caseModel.js";

const app = makeApp(["/api/pdf", pdfRoutes]);

let admin, neutral;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  admin   = await seedUser("admin");
  neutral = await seedUser("mediator");
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ────────────────────────────────────────────
   AWARD PDF GENERATION + awardRef PERSISTENCE
──────────────────────────────────────────── */
describe("GET /api/pdf/award/:caseId — awardRef persistence", () => {
  it("generates PDF, returns X-Award-Ref header, persists awardRef on case", async () => {
    const c = await seedCase({
      status:           "resolved",
      assignedMediator: neutral.user._id,
    });

    const res = await supertest(app)
      .get(`/api/pdf/award/${c._id}`)
      .set(auth(admin.token))
      .expect(200);

    assert.equal(res.headers["content-type"], "application/pdf");
    const awardRef = res.headers["x-award-ref"];
    assert.ok(awardRef, "X-Award-Ref header must be present");
    assert.ok(awardRef.startsWith("RMZ-AWD-"), "awardRef must follow RMZ-AWD- format");

    const updated = await Case.findById(c._id);
    assert.equal(updated.awardRef, awardRef);
    assert.equal(updated.awardVersion, 1);
    assert.ok(updated.awardGeneratedAt);
  });

  it("increments awardVersion on regeneration", async () => {
    const c = await seedCase({
      status:           "resolved",
      assignedMediator: neutral.user._id,
    });

    const res1 = await supertest(app)
      .get(`/api/pdf/award/${c._id}`)
      .set(auth(admin.token))
      .expect(200);

    const awardRef = res1.headers["x-award-ref"];

    const res2 = await supertest(app)
      .get(`/api/pdf/award/${c._id}`)
      .set(auth(admin.token))
      .expect(200);

    assert.equal(res2.headers["x-award-ref"], awardRef, "same awardRef on regeneration");

    const updated = await Case.findById(c._id);
    assert.equal(updated.awardVersion, 2);
  });

  it("returns 403 for user who is not admin or assigned neutral", async () => {
    const c      = await seedCase({ status: "resolved" });
    const other  = await seedUser("mediator");
    await supertest(app)
      .get(`/api/pdf/award/${c._id}`)
      .set(auth(other.token))
      .expect(403);
  });

  it("returns 400 if case is not in resolved/awarded status", async () => {
    const c = await seedCase({ status: "in-progress" });
    const { body } = await supertest(app)
      .get(`/api/pdf/award/${c._id}`)
      .set(auth(admin.token))
      .expect(400);
    assert.equal(body.success, false);
  });

  it("returns 401 without token", async () => {
    const c = await seedCase({ status: "resolved" });
    await supertest(app)
      .get(`/api/pdf/award/${c._id}`)
      .expect(401);
  });
});

/* ────────────────────────────────────────────
   VERIFY AWARD (public endpoint — no auth)
──────────────────────────────────────────── */
describe("GET /api/pdf/verify/:awardRef", () => {
  it("verifies a known awardRef and returns case details", async () => {
    const awardRef = `RMZ-AWD-${new Date().getFullYear()}-ABCD12-TST001`;
    await seedCase({
      status:   "resolved",
      awardRef,
      awardVersion: 1,
      awardGeneratedAt: new Date(),
    });

    const { body } = await supertest(app)
      .get(`/api/pdf/verify/${awardRef}`)
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.verified, true);
    assert.equal(body.award.awardRef, awardRef);
    assert.ok(body.award.caseId);
    assert.ok(body.award.platform);
  });

  it("returns 404 for unknown awardRef", async () => {
    const { body } = await supertest(app)
      .get("/api/pdf/verify/RMZ-AWD-2099-FFFFFF-NOTEXIST")
      .expect(404);
    assert.equal(body.success, false);
  });
});
