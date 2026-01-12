import express from "express";
import { sendMessage, getMessages } from "../src/controllers/chatController.js";

const router = express.Router();

router.post("/send", sendMessage);
router.get("/:user1/:user2", getMessages);

export default router;
