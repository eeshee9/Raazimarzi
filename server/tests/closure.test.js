import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import adminRoutes from "../src/routes/adminRoutes.js";

const app = makeApp(["/api/admin", adminRoutes]);

let admin;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  admin = await seedUser("admin");
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ────────────────────────────────────────────
   CLOSURE CHECKLIST
──────────────────────────────────────────── */
describe("GET /api/admin/cases/:id/closure-checklist", () => {
  it("returns 404 for unknown case", async () => {
    const { body } = await supertest(app)
      .get("/api/admin/cases/000000000000000000000001/closure-checklist")
      .set(auth(admin.token))
      .expect(404);
    assert.equal(body.success, false);
  });

  it("returns checklist with canClose=false when status is not resolved", async () => {
    const c = await seedCase({ status: "in-progress" });
    const { body } = await supertest(app)
      .get(`/api/admin/cases/${c._id}/closure-checklist`)
      .set(auth(admin.token))
      .expect(200);
    assert.equal(body.success, true);
    assert.equal(body.canClose, false);
    assert.ok(body.blockers.length > 0);
  });

  it("returns canClose=true when case is resolved with summary", async () => {
    const c = await seedCase({
      status:            "resolved",
      resolutionSummary: "Both parties settled amicably",
    });
    const { body } = await supertest(app)
      .get(`/api/admin/cases/${c._id}/closure-checklist`)
      .set(auth(admin.token))
      .expect(200);
    assert.equal(body.canClose, true);
    assert.equal(body.blockers.length, 0);
    assert.equal(body.checklist.isResolved, true);
    assert.equal(body.checklist.hasSummary, true);
  });

  it("returns 401 when no token", async () => {
    const c = await seedCase({ status: "resolved" });
    await supertest(app)
      .get(`/api/admin/cases/${c._id}/closure-checklist`)
      .expect(401);
  });
});

/* ────────────────────────────────────────────
   CLOSE CASE
──────────────────────────────────────────── */
describe("POST /api/admin/cases/:id/close", () => {
  it("returns 400 if case is not resolved", async () => {
    const c = await seedCase({ status: "in-progress" });
    const { body } = await supertest(app)
      .post(`/api/admin/cases/${c._id}/close`)
      .set(auth(admin.token))
      .send({ closureReason: "Resolved by agreement" })
      .expect(400);
    assert.equal(body.success, false);
  });

  it("returns 400 if closureReason is missing", async () => {
    const c = await seedCase({ status: "resolved", resolutionSummary: "Summary here" });
    await supertest(app)
      .post(`/api/admin/cases/${c._id}/close`)
      .set(auth(admin.token))
      .send({})
      .expect(400);
  });

  it("closes a resolved case and sets isLocked=true", async () => {
    const c = await seedCase({
      status:            "resolved",
      resolutionSummary: "Parties agreed on settlement terms",
    });
    const { body } = await supertest(app)
      .post(`/api/admin/cases/${c._id}/close`)
      .set(auth(admin.token))
      .send({ closureReason: "Settlement reached" })
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.status, "closed");
    assert.equal(body.isLocked, true);
    assert.ok(body.closureMetadata?.closedAt);
    assert.equal(body.closureMetadata?.closureReason, "Settlement reached");
  });

  it("returns 409 if case is already closed", async () => {
    const c = await seedCase({
      status:            "closed",
      isLocked:          true,
      resolutionSummary: "Already closed",
    });
    const { body } = await supertest(app)
      .post(`/api/admin/cases/${c._id}/close`)
      .set(auth(admin.token))
      .send({ closureReason: "Trying again" })
      .expect(409);
    assert.equal(body.success, false);
  });
});

/* ────────────────────────────────────────────
   isLocked MUTATION DENIAL (409 guards)
──────────────────────────────────────────── */
describe("Locked-case mutation guards", () => {
  let lockedCase;

  beforeEach(async () => {
    lockedCase = await seedCase({
      status:            "closed",
      isLocked:          true,
      resolutionSummary: "Closed case",
    });
  });

  it("PATCH /status returns 409 on locked case", async () => {
    const { body } = await supertest(app)
      .patch(`/api/admin/cases/${lockedCase._id}/status`)
      .set(auth(admin.token))
      .send({ status: "Resolved" })
      .expect(409);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });

  it("PATCH /priority returns 409 on locked case", async () => {
    const { body } = await supertest(app)
      .patch(`/api/admin/cases/${lockedCase._id}/priority`)
      .set(auth(admin.token))
      .send({ priority: "High" })
      .expect(409);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });

  it("PATCH /hearing returns 409 on locked case", async () => {
    const { body } = await supertest(app)
      .patch(`/api/admin/cases/${lockedCase._id}/hearing`)
      .set(auth(admin.token))
      .send({ hearingDate: new Date().toISOString(), hearingLink: "https://meet.example.com" })
      .expect(409);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });

  it("PATCH /assign-neutral returns 409 on locked case", async () => {
    const { body } = await supertest(app)
      .patch(`/api/admin/cases/${lockedCase._id}/assign-neutral`)
      .set(auth(admin.token))
      .send({ neutralId: "000000000000000000000001", neutralType: "mediator" })
      .expect(409);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });

  it("PATCH /status blocks 'Closed' target even on unlocked case", async () => {
    const openCase = await seedCase({ status: "in-progress" });
    const { body } = await supertest(app)
      .patch(`/api/admin/cases/${openCase._id}/status`)
      .set(auth(admin.token))
      .send({ status: "Closed" })
      .expect(400);
    assert.ok(body.message.toLowerCase().includes("close"));
  });
});
