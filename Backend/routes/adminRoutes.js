// const express = require("express");
// const { getAllUsers, deleteUser } = require("../controllers/adminController");
// const { protect } = require("../middleware/authMiddleware");

// const router = express.Router();

// router.get("/test", (req, res) => res.json({ message: "Admin routes working ✅" }));

// router.get("/users", protect, getAllUsers);
// router.delete("/users/:id", protect, deleteUser);

// module.exports = router;

import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { getAllUsers, deleteUser } from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", protect, authorizeRoles("admin"), getAllUsers);
router.delete("/user/:id", protect, authorizeRoles("admin"), deleteUser);

export default router;
