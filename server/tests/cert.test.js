import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import pdfRoutes from "../src/routes/pdfRoutes.js";
import Case from "../src/models/caseModel.js";

const app = makeApp(["/api/pdf", pdfRoutes]);

let admin, mediator;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  admin   = await seedUser("admin");
  mediator = await seedUser("mediator");
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ────────────────────────────────────────────
   CERTIFICATE GENERATION + certRef PERSISTENCE
──────────────────────────────────────────── */
describe("POST /api/pdf/certificate/:caseId", () => {
  it("generates certificate, returns X-Certificate-Ref header, persists certRef", async () => {
    const c = await seedCase({
      status:           "resolved",
      assignedMediator: mediator.user._id,
    });

    const res = await supertest(app)
      .post(`/api/pdf/certificate/${c._id}`)
      .set(auth(admin.token))
      .send({ certificateType: "mediation-settlement" })
      .expect(200);

    assert.equal(res.headers["content-type"], "application/pdf");
    const certRef = res.headers["x-certificate-ref"];
    assert.ok(certRef, "X-Certificate-Ref header must be present");
    assert.ok(certRef.startsWith("RMZ-CERT-"), "certRef must follow RMZ-CERT- format");

    const updated = await Case.findById(c._id);
    assert.equal(updated.certificateRef, certRef);
    assert.equal(updated.certificateType, "mediation-settlement");
    assert.ok(updated.certificateGeneratedAt);
  });

  it("returns 400 for invalid certificateType", async () => {
    const c = await seedCase({ status: "resolved" });
    const { body } = await supertest(app)
      .post(`/api/pdf/certificate/${c._id}`)
      .set(auth(admin.token))
      .send({ certificateType: "invalid-type" })
      .expect(400);
    assert.equal(body.success, false);
  });

  it("returns 400 if case is not resolved/closed", async () => {
    const c = await seedCase({ status: "in-progress" });
    const { body } = await supertest(app)
      .post(`/api/pdf/certificate/${c._id}`)
      .set(auth(admin.token))
      .send({ certificateType: "mediation-settlement" })
      .expect(400);
    assert.equal(body.success, false);
  });

  it("returns 403 for unrelated mediator", async () => {
    const c    = await seedCase({ status: "resolved" });
    const { body } = await supertest(app)
      .post(`/api/pdf/certificate/${c._id}`)
      .set(auth(mediator.token))
      .send({ certificateType: "mediation-settlement" })
      .expect(403);
    assert.equal(body.success, false);
  });

  it("returns 401 without token", async () => {
    const c = await seedCase({ status: "resolved" });
    await supertest(app)
      .post(`/api/pdf/certificate/${c._id}`)
      .send({ certificateType: "mediation-settlement" })
      .expect(401);
  });
});

/* ────────────────────────────────────────────
   VERIFY CERTIFICATE (public endpoint)
──────────────────────────────────────────── */
describe("GET /api/pdf/verify-cert/:certRef", () => {
  it("verifies a known certRef and returns certificate details", async () => {
    const certRef = `RMZ-CERT-${new Date().getFullYear()}-ABCD12-TST001`;
    await seedCase({
      status:                 "resolved",
      certificateRef:         certRef,
      certificateType:        "mediation-settlement",
      certificateGeneratedAt: new Date(),
    });

    const { body } = await supertest(app)
      .get(`/api/pdf/verify-cert/${certRef}`)
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.verified, true);
    assert.equal(body.certificate.certRef, certRef);
    assert.equal(body.certificate.certificateType, "mediation-settlement");
    assert.ok(body.certificate.platform);
  });

  it("returns 404 for unknown certRef", async () => {
    const { body } = await supertest(app)
      .get("/api/pdf/verify-cert/RMZ-CERT-2099-FFFFFF-NOTEXIST")
      .expect(404);
    assert.equal(body.success, false);
  });
});
