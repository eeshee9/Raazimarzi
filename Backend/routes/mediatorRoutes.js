// const express = require("express");
// const { getAssignedCases, updateCase } = require("../controllers/mediatorController");
// const { protect } = require("../middleware/authMiddleware");

// const router = express.Router();

// router.get("/test", (req, res) => res.json({ message: "Mediator routes working ✅" }));

// router.get("/cases", protect, getAssignedCases);
// router.put("/cases/:id", protect, updateCase);

// module.exports = router;


import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { getAssignedCases, updateCaseStatus } from "../controllers/mediatorController.js";

const router = express.Router();

router.get("/cases", protect, authorizeRoles("mediator"), getAssignedCases);
router.put("/cases/:id", protect, authorizeRoles("mediator"), updateCaseStatus);

export default router;
