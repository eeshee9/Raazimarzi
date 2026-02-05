import express from "express";
import {
  registerUser,
  loginUser,
  getMyProfile,
  updateProfile,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// ==================== PROTECTED ROUTES ====================
router.get("/me", protect, getMyProfile);
router.put("/update", protect, updateProfile);

export default router;