import express from "express";
import { resetPassword } from "../src/controllers/passwordController.js";

const router = express.Router();

router.post("/reset-password", resetPassword);

export default router;
