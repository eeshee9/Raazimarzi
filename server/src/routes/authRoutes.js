import express from "express";
import {
  signup,
  login,
  sendPasswordResetOtp,
  verifyOtp,
  registerUser,
  loginUser,
  getMyProfile,
  updateProfile,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", sendPasswordResetOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
// ==================== PROTECTED ROUTES ====================
router.get("/me", protect, getMyProfile);
router.put("/update", protect, updateProfile);

export default router;