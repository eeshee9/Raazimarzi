// const express = require("express");
// const { createCase, getMyCases, getCaseById, uploadEvidence } = require("../controllers/party1Controller");
// const { protect } = require("../middleware/authMiddleware");
// const upload = require("../middleware/uploadMiddleware");

// const router = express.Router();

// router.get("/test", (req, res) => {
//   res.json({ message: "User routes working ✅" });
// });

// router.post("/cases", protect, createCase);
// router.get("/cases", protect, getMyCases);
// router.get("/cases/:id", protect, getCaseById);
// router.put("/cases/:id/evidence", protect, upload.single("evidence"), uploadEvidence);

// module.exports = router;

import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
