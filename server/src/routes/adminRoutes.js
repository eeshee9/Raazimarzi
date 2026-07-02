import express from "express";
import protect, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getAllUsers, deleteUser, updateUserRole, suspendUser, activateUser, getAdminInfo,
  getAdminUsersAnalytics, getAdminUserDetail,
  getCaseManagers, getMediators, getArbitrators,
  getAllCases, getCaseById, getCaseProgress,
  reviewCase, declareExParte,
  assignCaseManager, assignNeutral,
  updateCaseStatus, updateCasePriority, scheduleHearing, addTimelineNote,
  getDashboardStats, getAdminDashboard,
} from "../controllers/adminController.js";
import { getClosureChecklist, closeCase } from "../controllers/closureController.js";
import { getAllContacts, deleteContact } from "../controllers/adminContactController.js";
import {
  getAdminMediators, getAdminMediatorDetail, getMediatorAssignableCases,
  approveMediatorStatus, rejectMediatorStatus,
} from "../controllers/adminMediatorController.js";
import {
  getMyProfile, updateMyProfile, verifyPassword,
  listSubAdmins, getSubAdminById, createSubAdmin,
  updateSubAdminPermissions, toggleSubAdminStatus, deleteSubAdmin,
  getActivityLogs,
} from "../controllers/adminProfileController.js";

const router = express.Router();
const adminOnly       = [protect, authorizeRoles(["admin"])];
const adminOrManager  = [protect, authorizeRoles(["admin", "case-manager"])];
const adminOrSubAdmin = [protect, authorizeRoles(["admin", "sub-admin"])];

/* ─── Admin Info ─── */
router.get("/info", getAdminInfo);

/* ─── Dashboard ─── */
router.get("/dashboard",       ...adminOnly, getAdminDashboard);  
router.get("/dashboard/stats", ...adminOnly, getDashboardStats);   

/* ─── Users ─── */
router.get("/users/analytics",        ...adminOnly, getAdminUsersAnalytics);
router.get("/users/:id/detail",       ...adminOnly, getAdminUserDetail);
router.get("/users",                  ...adminOnly, getAllUsers);
router.patch("/users/:id/role",       ...adminOnly, updateUserRole);
router.patch("/users/:id/suspend",    ...adminOnly, suspendUser);
router.patch("/users/:id/activate",   ...adminOnly, activateUser);
router.delete("/users/:id",           ...adminOnly, deleteUser);

/* ─── Staff Dropdowns ─── */
router.get("/staff/case-managers", ...adminOnly, getCaseManagers);
router.get("/staff/mediators",     ...adminOnly, getMediators);
router.get("/staff/arbitrators",   ...adminOnly, getArbitrators);

/* ─── Cases ─── */
router.get("/cases",                          ...adminOrManager, getAllCases);
router.get("/cases/:id",                      ...adminOrManager, getCaseById);
router.get("/case-progress/:caseId",          ...adminOnly,      getCaseProgress);  
router.patch("/cases/:id/review",             ...adminOnly,      reviewCase);
router.patch("/cases/:id/ex-parte",           ...adminOnly,      declareExParte);
router.patch("/cases/:id/assign-manager",     ...adminOnly,      assignCaseManager);
router.patch("/cases/:id/assign-neutral",     ...adminOnly,      assignNeutral);
router.patch("/cases/:id/status",             ...adminOrManager, updateCaseStatus);
router.patch("/cases/:id/priority",           ...adminOnly,      updateCasePriority);
router.patch("/cases/:id/hearing",            ...adminOrManager, scheduleHearing);
router.post("/cases/:id/note",                ...adminOrManager, addTimelineNote);

/* ─── Mediators (admin module) ─── */
router.get("/mediators",                        ...adminOnly, getAdminMediators);
router.get("/mediators/:id/detail",             ...adminOnly, getAdminMediatorDetail);
router.get("/mediators/:id/assignable-cases",   ...adminOnly, getMediatorAssignableCases);
router.patch("/mediators/:id/approve",          ...adminOnly, approveMediatorStatus);
router.patch("/mediators/:id/reject",           ...adminOnly, rejectMediatorStatus);

/* ─── Contacts ─── */
router.get("/contacts",        ...adminOnly, getAllContacts);
router.delete("/contacts/:id", ...adminOnly, deleteContact);

/* ─── Admin Profile (self-service: admin or sub-admin viewing their OWN profile) ─── */
router.get("/profile",                  ...adminOrSubAdmin, getMyProfile);
router.patch("/profile",                ...adminOrSubAdmin, updateMyProfile);
router.post("/profile/verify-password", ...adminOrSubAdmin, verifyPassword);

/* ─── Sub-Admins (Admin Profile → Sub Admins tab) ─── */
router.get("/sub-admins",                      ...adminOnly, listSubAdmins);
router.get("/sub-admins/:id",                  ...adminOnly, getSubAdminById);
router.post("/sub-admins",                     ...adminOnly, createSubAdmin);
router.patch("/sub-admins/:id/permissions",    ...adminOnly, updateSubAdminPermissions);
router.patch("/sub-admins/:id/status",         ...adminOnly, toggleSubAdminStatus);
router.delete("/sub-admins/:id",               ...adminOnly, deleteSubAdmin);

/* ─── Platform-wide Activity Logs tab ─── */
router.get("/activity-logs", ...adminOnly, getActivityLogs);

/* ─── Case Closure ─── */
router.get("/cases/:id/closure-checklist", ...adminOnly, getClosureChecklist);
router.post("/cases/:id/close",            ...adminOnly, closeCase);

export default router;