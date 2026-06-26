import express from "express";
import {
  signup,
  login,
  mediatorSignup,
  sendPasswordResetOtp,
  verifyOtp,
  resetPassword,
  getMyProfile,
  updateProfile,
  getCurrentUser,
  changePassword,
  updateNotifications,
} from "../controllers/authController.js";

// ✅ Import NEW profile functions from userController
import {
  getUserProfile,
  updateUserProfile
} from "../controllers/userController.js";

import protect from "../middleware/authMiddleware.js";
import { uploadAvatar } from "../config/uploadConfig.js";
import documentUpload from "../middleware/documentUpload.js";

const router = express.Router();

const mediatorDocFields = documentUpload.fields([
  { name: "qualificationDegree",      maxCount: 1 },
  { name: "certification",            maxCount: 1 },
  { name: "legalLicense",             maxCount: 1 },
  { name: "govtId",                   maxCount: 1 },
  { name: "barCouncilRegistration",   maxCount: 1 },
  { name: "policeVerification",       maxCount: 1 },
]);

/* ==================== PUBLIC ROUTES ==================== */
router.post("/signup", signup);
router.post("/mediator-signup", mediatorDocFields, mediatorSignup);
router.post("/login", login);

// Password reset flow
router.post("/forgot-password", sendPasswordResetOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

/* ==================== PROTECTED ROUTES ==================== */
// Your existing routes
router.get("/current-user", protect, getCurrentUser);
router.get("/my-profile", protect, getMyProfile);
router.put("/update", protect, updateProfile);

// ✅ NEW Profile routes with avatar upload
router.get("/me", protect, getUserProfile);
router.put("/profile", protect, uploadAvatar.single("avatar"), updateUserProfile);

// ✅ Account management
router.post("/change-password", protect, changePassword);
router.patch("/notifications", protect, updateNotifications);

export default router;