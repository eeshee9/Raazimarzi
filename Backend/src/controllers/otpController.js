import Otp from "../models/otpModel.js";
import User from "../models/userModel.js"; // ✅ Added
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ✅ Send OTP
export const sendOtp = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    // ✅ FORGOT PASSWORD CHECK
    if (type === "forgot-password") {
      const user = await User.findOne({ email });
      if (!user)
        return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await newOtp.save();

    console.log("✅ OTP saved to MongoDB:", newOtp);

    // ✅ Correct Zoho SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true, // important for Zoho SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // use your Zoho app password here
      },
    });

    // Test connection (optional)
    transporter.verify((error, success) => {
      if (error) console.error("SMTP error:", error);
      else console.log("✅ Zoho SMTP connection ready");
    });

    // Send email
    try {
      const info = await transporter.sendMail({
        from: `"RaaziMarzi App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your RaaziMarzi OTP Code",
        text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
        html: `<p>Your OTP code is <b>${otp}</b></p><p>This code will expire in 5 minutes.</p>`,
      });
      console.log("✅ Email sent:", info.response);
      res.status(200).json({ message: "OTP sent successfully" });
    } catch (mailError) {
      console.error("❌ Email send error:", mailError);
      res.status(500).json({
        message: "Error sending OTP",
        error: mailError.message,
      });
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};

// ✅ Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, type, name, phone, role } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const record = await Otp.findOne({ email });
    if (!record)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, record.otpHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid OTP" });

    await Otp.deleteMany({ email });

    // 🔀 DECIDE WHAT THIS OTP IS FOR
    if (type === "signup") {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "User already exists" });

      const newUser = await User.create({
        name,
        email,
        phone,
        role: role || "user",
        verified: true,
      });

      return res.status(200).json({
        message: "Signup OTP verified",
        user: newUser,
      });
    }

    if (type === "forgot-password") {
      return res.status(200).json({
        message: "OTP verified for password reset",
      });
    }

    return res.status(400).json({ message: "Invalid OTP type" });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
