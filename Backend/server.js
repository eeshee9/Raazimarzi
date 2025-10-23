import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import caseRoutes from "./routes/caseRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import mediatorRoutes from "./routes/mediatorRoutes.js";
import caseManagerRoutes from "./routes/caseManagerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";


dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/cases", caseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mediator", mediatorRoutes);
app.use("/api/case-manager", caseManagerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
