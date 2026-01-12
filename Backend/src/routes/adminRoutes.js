import express from "express";
import { protect, authorizeRoles } from "../src/middleware/authMiddleware.js";
import { getAllUsers, deleteUser } from "../src/controllers/adminController.js";

const router = express.Router();

router.get("/users", protect, authorizeRoles(["admin"]), getAllUsers);
router.delete("/users/:id", protect, authorizeRoles(["admin"]), deleteUser);

export default router;
