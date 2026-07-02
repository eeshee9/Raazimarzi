/**
 * Route authorization tests.
 * Verifies that:
 *   - 401 is returned when no Bearer token is sent
 *   - 403 is returned for wrong role
 *   - 200 is returned for the correct role
 */
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import express from "express";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import adminRoutes    from "../src/routes/adminRoutes.js";
import mediatorRoutes from "../src/routes/mediatorRoutes.js";
import consentRoutes  from "../src/routes/consentRoutes.js";
import pdfRoutes      from "../src/routes/pdfRoutes.js";

const app = makeApp(
  ["/api/admin",    adminRoutes],
  ["/api/mediator", mediatorRoutes],
  ["/api/consent",  consentRoutes],
  ["/api/pdf",      pdfRoutes],
);

let admin, mediator, regularUser, testCase;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  admin       = await seedUser("admin");
  mediator    = await seedUser("mediator");
  regularUser = await seedUser("user");
  testCase    = await seedCase({ status: "in-progress", assignedMediator: mediator.user._id });
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ────────────────────────────────────────────
   ADMIN ROUTES
──────────────────────────────────────────── */
describe("Admin route authorization", () => {
  it("GET /api/admin/cases → 401 without token", async () => {
    await supertest(app).get("/api/admin/cases").expect(401);
  });

  it("GET /api/admin/cases → 403 for mediator role", async () => {
    await supertest(app)
      .get("/api/admin/cases")
      .set(auth(mediator.token))
      .expect(403);
  });

  it("GET /api/admin/cases → 200 for admin role", async () => {
    const { body } = await supertest(app)
      .get("/api/admin/cases")
      .set(auth(admin.token))
      .expect(200);
    assert.equal(body.success, true);
  });

  it("POST /api/admin/cases/:id/close → 401 without token", async () => {
    await supertest(app)
      .post(`/api/admin/cases/${testCase._id}/close`)
      .send({ closureReason: "Test" })
      .expect(401);
  });

  it("POST /api/admin/cases/:id/close → 403 for mediator", async () => {
    await supertest(app)
      .post(`/api/admin/cases/${testCase._id}/close`)
      .set(auth(mediator.token))
      .send({ closureReason: "Mediator attempting to close" })
      .expect(403);
  });

  it("GET /api/admin/cases/:id/closure-checklist → 403 for regular user", async () => {
    await supertest(app)
      .get(`/api/admin/cases/${testCase._id}/closure-checklist`)
      .set(auth(regularUser.token))
      .expect(403);
  });
});

/* ────────────────────────────────────────────
   MEDIATOR ROUTES
──────────────────────────────────────────── */
describe("Mediator route authorization", () => {
  it("GET /api/mediator/cases → 401 without token", async () => {
    await supertest(app).get("/api/mediator/cases").expect(401);
  });

  it("GET /api/mediator/cases → 403 for regular user", async () => {
    await supertest(app)
      .get("/api/mediator/cases")
      .set(auth(regularUser.token))
      .expect(403);
  });

  it("GET /api/mediator/cases → 200 for mediator role", async () => {
    const { body } = await supertest(app)
      .get("/api/mediator/cases")
      .set(auth(mediator.token))
      .expect(200);
    assert.equal(body.success, true);
  });

  it("GET /api/mediator/cases → 200 for admin (admin bypasses portal gate)", async () => {
    const { body } = await supertest(app)
      .get("/api/mediator/cases")
      .set(auth(admin.token))
      .expect(200);
    assert.equal(body.success, true);
  });

  it("PATCH /api/mediator/cases/:id/resolve → 403 for regular user", async () => {
    await supertest(app)
      .patch(`/api/mediator/cases/${testCase._id}/resolve`)
      .set(auth(regularUser.token))
      .send({ status: "resolved" })
      .expect(403);
  });

  it("mediator with approvalStatus=pending is denied by portal gate", async () => {
    const pending = await seedUser("mediator", { approvalStatus: "pending" });
    await supertest(app)
      .get("/api/mediator/cases")
      .set(auth(pending.token))
      .expect(403);
  });
});

/* ────────────────────────────────────────────
   CONSENT ROUTES
──────────────────────────────────────────── */
describe("Consent route authorization", () => {
  it("POST /api/consent/record → 401 without token", async () => {
    await supertest(app)
      .post("/api/consent/record")
      .send({ caseId: String(testCase._id), documentStage: "resolution", consentText: "x".repeat(30) })
      .expect(401);
  });

  it("GET /api/consent/case/:id → 401 without token", async () => {
    await supertest(app)
      .get(`/api/consent/case/${testCase._id}`)
      .expect(401);
  });

  it("GET /api/consent/case/:id → 403 for regular user (not admin or mediator)", async () => {
    await supertest(app)
      .get(`/api/consent/case/${testCase._id}`)
      .set(auth(regularUser.token))
      .expect(403);
  });
});

/* ────────────────────────────────────────────
   PDF ROUTES
──────────────────────────────────────────── */
describe("PDF route authorization", () => {
  it("GET /api/pdf/award/:caseId → 401 without token", async () => {
    await supertest(app)
      .get(`/api/pdf/award/${testCase._id}`)
      .expect(401);
  });

  it("GET /api/pdf/award/:caseId → 403 for regular user", async () => {
    await supertest(app)
      .get(`/api/pdf/award/${testCase._id}`)
      .set(auth(regularUser.token))
      .expect(403);
  });

  it("GET /api/pdf/verify/:ref → 200 without token (public endpoint)", async () => {
    const { body } = await supertest(app)
      .get("/api/pdf/verify/RMZ-AWD-2099-FFFFFF-NOTEXIST")
      .expect(404);
    // 404 means the endpoint was reached (auth not required)
    assert.equal(body.success, false);
  });

  it("GET /api/pdf/verify-cert/:ref → 200 without token (public endpoint)", async () => {
    const { body } = await supertest(app)
      .get("/api/pdf/verify-cert/RMZ-CERT-2099-FFFFFF-NOTEXIST")
      .expect(404);
    assert.equal(body.success, false);
  });
});
