/**
 * Notification trigger tests.
 * Verifies that endpoints requiring notifications:
 *   - Complete successfully (200/201) even when notification services are unconfigured
 *   - Do not block the HTTP response waiting for notification delivery
 *   - Return the correct business payload regardless of notification outcome
 *
 * The mail and WhatsApp services use lazy init and fire-and-forget patterns,
 * so misconfigured credentials (or test stubs) cause silent failures, never
 * endpoint failures.
 */
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import adminRoutes    from "../src/routes/adminRoutes.js";
import mediatorRoutes from "../src/routes/mediatorRoutes.js";

const app = makeApp(
  ["/api/admin",    adminRoutes],
  ["/api/mediator", mediatorRoutes],
);

let admin, mediator;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  admin    = await seedUser("admin");
  mediator = await seedUser("mediator");
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe("Case closure notification resilience", () => {
  it("POST /api/admin/cases/:id/close returns 200 even though email/WA services are stubs", async () => {
    const c = await seedCase({
      status:            "resolved",
      resolutionSummary: "Parties reached full and final settlement of all claims",
    });

    const start = Date.now();
    const { body } = await supertest(app)
      .post(`/api/admin/cases/${c._id}/close`)
      .set(auth(admin.token))
      .send({ closureReason: "Settlement reached — parties notified" })
      .expect(200);
    const elapsed = Date.now() - start;

    assert.equal(body.success, true);
    assert.equal(body.status, "closed");
    assert.equal(body.isLocked, true);
    // Response should not wait for notification delivery (fire-and-forget)
    // 5 second ceiling — if this fails we likely have a blocking notification call
    assert.ok(elapsed < 5000, `Response took ${elapsed}ms — notifications may be blocking`);
  });

  it("POST /api/admin/cases/:id/close closure metadata is persisted regardless of notification outcome", async () => {
    const c = await seedCase({
      status:            "resolved",
      resolutionSummary: "Complete resolution with full party agreement on all terms",
      petitionerDetails: { fullName: "Rajesh Kumar", mobile: "+919876543210" },
      defendantDetails:  { fullName: "Priya Singh",  mobile: "+919876543211" },
    });

    const { body } = await supertest(app)
      .post(`/api/admin/cases/${c._id}/close`)
      .set(auth(admin.token))
      .send({
        closureReason: "Full settlement",
        closureNotes:  "Both parties satisfied with outcome",
      })
      .expect(200);

    assert.ok(body.closureMetadata.closedAt);
    assert.equal(body.closureMetadata.closureReason, "Full settlement");
    assert.equal(body.closureMetadata.closureNotes,  "Both parties satisfied with outcome");
  });
});

describe("Resolution submission notification resilience", () => {
  it("POST /api/mediator/cases/:id/resolution/submit returns 200 even with stubs", async () => {
    const c = await seedCase({
      status:           "in-progress",
      assignedMediator: mediator.user._id,
    });

    const { body } = await supertest(app)
      .post(`/api/mediator/cases/${c._id}/resolution/submit`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:  "The parties have resolved their dispute regarding property boundary through dialogue",
        settlementTerms: "Claimant accepts boundary at marker B42; respondent pays INR 25000 within 30 days",
        resolutionType:  "settlement",
        awardType:       "settlement",
      })
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.status, "resolved");
    // Email to admin is fire-and-forget — should not affect this response
    assert.equal(body.resolutionDraft.status, "submitted");
  });
});
