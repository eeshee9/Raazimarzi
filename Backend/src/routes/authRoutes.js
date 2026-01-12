import express from "express";
import { signup, sendOtp, verifyOtp } from "../controllers/authController.js";

const router = express.Router();


router.post("/signup", signup);
router.post("/", sendOtp);
router.post("/verify", verifyOtp);

export default router;
