import Case from "../models/caseModel.js";
import User from "../models/userModel.js";

/* ═══════════════════════════════════════════════════════════════
   Shared case-access check — used by both documentController.js
   (where it originated) and caseController.getCaseById, so a case
   and its documents are always governed by the same rule:

   A user may access a case if they are:
     - an admin, sub-admin, or case-manager (role-based), or
     - the petitioner (createdBy / claimant), or
     - the respondent (respondent.userId, or an email match against
       respondent.email / defendantDetails.email — covers users who
       haven't linked an account yet), or
     - the assigned neutral (mediator/arbitrator).
   Everyone else is denied.
═══════════════════════════════════════════════════════════════ */
export const canAccessCase = async (userId, caseId, userRole) => {
  if (["admin", "sub-admin", "case-manager"].includes(userRole)) return true;

  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) return false;

  // User is claimant (new field) or created the case (legacy)
  if (
    caseDoc.createdBy?.toString() === userId.toString() ||
    caseDoc.claimant?.toString() === userId.toString()
  ) return true;

  // User is respondent (new system)
  if (caseDoc.respondent?.userId?.toString() === userId.toString()) return true;

  // User is respondent (legacy — email match)
  const userEmail = await getUserEmail(userId);
  if (caseDoc.defendantDetails?.email === userEmail) return true;
  if (caseDoc.respondent?.email === userEmail) return true;

  // User is assigned neutral (mediator or arbitrator)
  if (caseDoc.assignedNeutral?.toString() === userId.toString()) return true;
  if (caseDoc.assignedMediator?.toString() === userId.toString()) return true;

  return false;
};

const getUserEmail = async (userId) => {
  const user = await User.findById(userId);
  return user?.email;
};
