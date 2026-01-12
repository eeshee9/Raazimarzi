import express from "express";
import multer from "multer";
import path from "path";
import {
  fileNewCase,
  getAllCases,
  getUserCases,
} from "../src/controllers/caseController.js";

const router = express.Router();

//  Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // store in /uploads folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

//  Routes
router.post("/file", upload.single("idProofFile"), fileNewCase);
router.get("/all", getAllCases);
router.get("/user/:userId", getUserCases);

export default router;
