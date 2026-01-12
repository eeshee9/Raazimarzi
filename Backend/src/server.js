import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mediatorRoutes from "./routes/mediatorRoutes.js";
import userRoutes from "./routes/userRoutes.js"; 
import adminRoutes from "./routes/adminRoutes.js"; 
import otpRoutes from "./routes/otpRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import caseRoutes from "./routes/caseRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { createServer } from "http";
import { Server } from "socket.io";
import passwordRoutes from "./routes/passwordRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); 

// Routes
app.use("/api/mediator", mediatorRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/password", passwordRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Backend API is running");
});


// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

connectDB();

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Socket.IO Logic
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join specific chat room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Handle sendMessage event
  socket.on("sendMessage", (data) => {
    const { roomId, message } = data;

    // Broadcast message to everyone in the same room
    io.to(roomId).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

