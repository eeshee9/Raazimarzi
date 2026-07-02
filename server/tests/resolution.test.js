import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { startDb, stopDb, clearDb, seedUser, seedCase, makeApp } from "./helpers.js";
import mediatorRoutes from "../src/routes/mediatorRoutes.js";

const app = makeApp(["/api/mediator", mediatorRoutes]);

let mediator, testCase;

before(startDb);
after(stopDb);

beforeEach(async () => {
  await clearDb();
  mediator = await seedUser("mediator");
  testCase = await seedCase({
    status:           "in-progress",
    assignedMediator: mediator.user._id,
  });
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ────────────────────────────────────────────
   SAVE RESOLUTION DRAFT
──────────────────────────────────────────── */
describe("PATCH /api/mediator/cases/:id/resolution/draft", () => {
  it("saves a new resolution draft", async () => {
    const { body } = await supertest(app)
      .patch(`/api/mediator/cases/${testCase._id}/resolution/draft`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:   "Parties dispute ownership of plot 42B",
        settlementTerms:  "Claimant retains plot, respondent compensated INR 50000",
        resolutionType:   "settlement",
      })
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.resolutionDraft.status, "draft");
    assert.ok(body.resolutionDraft.draftCreatedAt);
    assert.ok(body.resolutionDraft.disputeSummary.includes("plot 42B"));
  });

  it("updates an existing draft without resetting other fields", async () => {
    await supertest(app)
      .patch(`/api/mediator/cases/${testCase._id}/resolution/draft`)
      .set(auth(mediator.token))
      .send({ disputeSummary: "Initial summary", resolutionType: "settlement" })
      .expect(200);

    const { body } = await supertest(app)
      .patch(`/api/mediator/cases/${testCase._id}/resolution/draft`)
      .set(auth(mediator.token))
      .send({ settlementTerms: "Updated terms added later" })
      .expect(200);

    assert.ok(body.resolutionDraft.disputeSummary.includes("Initial summary"));
    assert.ok(body.resolutionDraft.settlementTerms.includes("Updated terms"));
  });

  it("returns 401 without auth token", async () => {
    await supertest(app)
      .patch(`/api/mediator/cases/${testCase._id}/resolution/draft`)
      .send({ disputeSummary: "Test" })
      .expect(401);
  });

  it("returns 409 on a locked case", async () => {
    const locked = await seedCase({
      status:           "closed",
      isLocked:         true,
      assignedMediator: mediator.user._id,
    });
    const { body } = await supertest(app)
      .patch(`/api/mediator/cases/${locked._id}/resolution/draft`)
      .set(auth(mediator.token))
      .send({ disputeSummary: "Trying to edit closed case" })
      .expect(409);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });

  it("returns 404 for case not assigned to this mediator", async () => {
    const other = await seedCase({ status: "in-progress" });
    await supertest(app)
      .patch(`/api/mediator/cases/${other._id}/resolution/draft`)
      .set(auth(mediator.token))
      .send({ disputeSummary: "Unauthorised access attempt" })
      .expect(404);
  });
});

/* ────────────────────────────────────────────
   LOAD RESOLUTION DRAFT
──────────────────────────────────────────── */
describe("GET /api/mediator/cases/:id/resolution", () => {
  it("returns the saved draft", async () => {
    await supertest(app)
      .patch(`/api/mediator/cases/${testCase._id}/resolution/draft`)
      .set(auth(mediator.token))
      .send({ disputeSummary: "Persistent summary", resolutionType: "settlement" });

    const { body } = await supertest(app)
      .get(`/api/mediator/cases/${testCase._id}/resolution`)
      .set(auth(mediator.token))
      .expect(200);

    assert.equal(body.success, true);
    assert.ok(body.resolutionDraft.disputeSummary.includes("Persistent summary"));
    assert.equal(body.resolutionDraft.status, "draft");
  });

  it("returns null draft for fresh case", async () => {
    const { body } = await supertest(app)
      .get(`/api/mediator/cases/${testCase._id}/resolution`)
      .set(auth(mediator.token))
      .expect(200);
    assert.equal(body.success, true);
  });
});

/* ────────────────────────────────────────────
   SUBMIT RESOLUTION
──────────────────────────────────────────── */
describe("POST /api/mediator/cases/:id/resolution/submit", () => {
  it("submits resolution and moves case to 'resolved'", async () => {
    const { body } = await supertest(app)
      .post(`/api/mediator/cases/${testCase._id}/resolution/submit`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:  "Both parties agreed to mediated settlement of the dispute over plot 42B",
        settlementTerms: "Claimant retains property; respondent receives INR 50000 compensation",
        resolutionType:  "settlement",
        awardType:       "settlement",
      })
      .expect(200);

    assert.equal(body.success, true);
    assert.equal(body.status, "resolved");
    assert.equal(body.resolutionDraft.status, "submitted");
    assert.ok(body.resolutionDraft.submittedAt);
  });

  it("returns 400 if disputeSummary is too short", async () => {
    const { body } = await supertest(app)
      .post(`/api/mediator/cases/${testCase._id}/resolution/submit`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:  "Too short",
        settlementTerms: "Also too short",
        resolutionType:  "settlement",
      })
      .expect(400);
    assert.equal(body.success, false);
  });

  it("returns 409 if resolution already submitted", async () => {
    await supertest(app)
      .post(`/api/mediator/cases/${testCase._id}/resolution/submit`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:  "Full valid summary of the dispute for submission test",
        settlementTerms: "Full valid settlement terms agreed by all parties involved",
        resolutionType:  "settlement",
      });

    const { body } = await supertest(app)
      .post(`/api/mediator/cases/${testCase._id}/resolution/submit`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:  "Full valid summary of the dispute for submission test",
        settlementTerms: "Full valid settlement terms agreed by all parties involved",
        resolutionType:  "settlement",
      })
      .expect(409);
    assert.equal(body.success, false);
  });

  it("returns 409 on a locked case", async () => {
    const locked = await seedCase({
      status:           "closed",
      isLocked:         true,
      assignedMediator: mediator.user._id,
    });
    const { body } = await supertest(app)
      .post(`/api/mediator/cases/${locked._id}/resolution/submit`)
      .set(auth(mediator.token))
      .send({
        disputeSummary:  "Attempting to submit on a locked case with long enough summary",
        settlementTerms: "Terms that would apply but case is locked so should be rejected",
        resolutionType:  "settlement",
      })
      .expect(409);
    assert.ok(body.message.toLowerCase().includes("lock"));
  });
});
