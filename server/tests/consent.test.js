import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import consentRoutes from "../src/routes/consentRoutes.js";

const app = makeApp(["/api/consent", consentRoutes]);

let admin, mediator, regularUser, testCase;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  admin       = await seedUser("admin");
  mediator    = await seedUser("mediator");
  regularUser = await seedUser("user");
  testCase    = await seedCase({
    status:           "in-progress",
    assignedMediator: mediator.user._id,
  });
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const LONG_CONSENT = "I, the undersigned, hereby declare my consent to the mediation process and agree to the terms presented during this dispute resolution proceeding.";

/* ────────────────────────────────────────────
   RECORD CONSENT
──────────────────────────────────────────── */
describe("POST /api/consent/record", () => {
  it("records consent and returns a receiptId", async () => {
    const { body } = await supertest(app)
      .post("/api/consent/record")
      .set(auth(mediator.token))
      .send({
        caseId:        String(testCase._id),
        documentStage: "resolution",
        consentText:   LONG_CONSENT,
        documentRef:   "Resolution Draft v1",
      })
      .expect(201);

    assert.equal(body.success, true);
    assert.ok(body.receipt.receiptId.startsWith("RMZ-CONSENT-"));
    assert.ok(body.receipt.signedAt);
    assert.equal(body.receipt.documentStage, "resolution");
    assert.ok(body.receipt.disclosure.includes("text-declaration"));
  });

  it("returns 400 when consentText is too short", async () => {
    const { body } = await supertest(app)
      .post("/api/consent/record")
      .set(auth(mediator.token))
      .send({
        caseId:        String(testCase._id),
        documentStage: "resolution",
        consentText:   "Too short",
      })
      .expect(400);
    assert.equal(body.success, false);
    assert.ok(body.message.includes("20"));
  });

  it("returns 400 for invalid documentStage", async () => {
    const { body } = await supertest(app)
      .post("/api/consent/record")
      .set(auth(mediator.token))
      .send({
        caseId:        String(testCase._id),
        documentStage: "invalid-stage",
        consentText:   LONG_CONSENT,
      })
      .expect(400);
    assert.equal(body.success, false);
  });

  it("returns 409 when case is locked", async () => {
    const locked = await seedCase({ status: "closed", isLocked: true });
    const { body } = await supertest(app)
      .post("/api/consent/record")
      .set(auth(admin.token))
      .send({
        caseId:        String(locked._id),
        documentStage: "closure",
        consentText:   LONG_CONSENT,
      })
      .expect(409);
    assert.equal(body.success, false);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });

  it("returns 404 for unknown caseId", async () => {
    const { body } = await supertest(app)
      .post("/api/consent/record")
      .set(auth(mediator.token))
      .send({
        caseId:        "000000000000000000000001",
        documentStage: "resolution",
        consentText:   LONG_CONSENT,
      })
      .expect(404);
    assert.equal(body.success, false);
  });

  it("returns 401 without auth token", async () => {
    await supertest(app)
      .post("/api/consent/record")
      .send({
        caseId:        String(testCase._id),
        documentStage: "resolution",
        consentText:   LONG_CONSENT,
      })
      .expect(401);
  });

  it("all valid stages are accepted (filing, resolution, closure)", async () => {
    for (const stage of ["filing", "resolution", "closure"]) {
      const { body } = await supertest(app)
        .post("/api/consent/record")
        .set(auth(mediator.token))
        .send({
          caseId:        String(testCase._id),
          documentStage: stage,
          consentText:   LONG_CONSENT,
        })
        .expect(201);
      assert.ok(body.receipt.receiptId, `stage ${stage} should return receiptId`);
    }
  });
});

/* ────────────────────────────────────────────
   GET CONSENTS FOR CASE
──────────────────────────────────────────── */
describe("GET /api/consent/case/:caseId", () => {
  it("admin can retrieve all consents", async () => {
    await supertest(app)
      .post("/api/consent/record")
      .set(auth(mediator.token))
      .send({ caseId: String(testCase._id), documentStage: "resolution", consentText: LONG_CONSENT });

    const { body } = await supertest(app)
      .get(`/api/consent/case/${testCase._id}`)
      .set(auth(admin.token))
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.count, 1);
    assert.ok(body.consents[0].signerName);
    assert.ok(body.consents[0].signedAt);
  });

  it("assigned mediator can retrieve consents", async () => {
    const { body } = await supertest(app)
      .get(`/api/consent/case/${testCase._id}`)
      .set(auth(mediator.token))
      .expect(200);
    assert.equal(body.success, true);
  });

  it("unassigned mediator is denied", async () => {
    const other = await seedUser("mediator");
    await supertest(app)
      .get(`/api/consent/case/${testCase._id}`)
      .set(auth(other.token))
      .expect(403);
  });

  it("returns 401 without token", async () => {
    await supertest(app)
      .get(`/api/consent/case/${testCase._id}`)
      .expect(401);
  });
});
