import express from "express";
import { submitContactForm, getAllContacts } from "../controllers/Contact.controller.js";

const router = express.Router();

// Public route
router.post("/contact", submitContactForm);

// Admin route (optional)
router.get("/contacts", getAllContacts);

export default router;
