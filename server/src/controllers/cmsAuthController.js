// server/src/controllers/cmsAuth.controller.js
import jwt    from "jsonwebtoken";
import bcrypt from "bcryptjs";
import CmsUser from "../models/cmsUserModel.js";

const CMS_JWT_SECRET = process.env.CMS_JWT_SECRET || "cms-secret-change-in-prod";

// POST /api/cms/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await CmsUser.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      CMS_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("cms_token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("CMS login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/cms/auth/logout
export const logout = (req, res) => {
  res.clearCookie("cms_token");
  res.json({ success: true });
};

// GET /api/cms/auth/me
export const me = async (req, res) => {
  try {
    const user = await CmsUser.findById(req.cmsUser.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};