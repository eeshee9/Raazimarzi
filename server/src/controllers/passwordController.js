import User from "../models/userModel.js";

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    // Basic password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // OTP verification check
    if (!user.passwordResetAllowed) {
      return res.status(403).json({
        success: false,
        message: "OTP verification required before resetting password",
      });
    }

    // Set new password (hashed by pre-save hook)
    user.password = newPassword;

    // Lock password reset immediately
    user.passwordResetAllowed = false;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
};
