import User from "../models/userModel.js";

export const signup = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const newUser = await User.create({ name, email, phone, role });
    res.status(201).json({
      message: "Signup successful. Please verify with OTP to continue.",
      user: newUser,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
