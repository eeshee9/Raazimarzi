import User from "../models/userModel.js";
import Otp from "../models/otpModel.js";
import AdminActivityLog from "../models/adminActivityLogModel.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import { sendOtpMail, sendMediatorApplicationAdminEmail } from "../services/mail.service.js";
import { uploadDocument as uploadToNeev } from "../utils/storageProvider.js";
import { isMediatorPortalLive } from "../utils/featureFlags.js";

/* Fields that must never be settable by a client on public signup/registration —
   they are the only privilege-bearing fields these endpoints could otherwise
   mass-assign from req.body. Any attempt is logged, never honored. */
const PRIVILEGE_FIELDS = ["approvalStatus", "permissions", "isAdmin", "status", "verified", "verificationDocs", "isActive"];

const flagPrivilegeEscalationAttempt = (req, endpoint) => {
  const attemptedRole = req.body.role && req.body.role !== "user" ? req.body.role : null;
  const flaggedFields = PRIVILEGE_FIELDS.filter((f) => req.body[f] !== undefined);
  if (attemptedRole || flaggedFields.length) {
    console.warn(
      `⚠️  Blocked privilege-escalation attempt on ${endpoint} — email=${req.body.email || "?"} ip=${req.ip || "?"} ` +
      `attemptedRole=${attemptedRole || "none"} fields=[${flaggedFields.join(",")}]`
    );
  }
};

/* Maps multipart field names -> verificationDocs.docType */
const MEDIATOR_DOC_FIELDS = {
  qualificationDegree:  "qualification_degree",
  certification:        "mediation_certification",
  legalLicense:          "legal_license",
  govtId:               "govt_id",
  barCouncilRegistration: "bar_council_registration",
  policeVerification:    "police_verification",
};

/* ================= SIGNUP ================= */
export const signup = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;
    flagPrivilegeEscalationAttempt(req, "POST /auth/signup");

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Name, email, password and confirmPassword are required"
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }
    // Never trust the password-match check done in the browser alone —
    // re-verify it server-side so a direct API call can't create an
    // account with mismatched password/confirmPassword.
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email"
      });
    }

    // Create new user — role is always "user"; public signup can never grant
    // elevated roles. Mediator accounts are only created via /auth/mediator-signup,
    // and admin/sub-admin accounts only via authenticated admin-only endpoints.
    const newUser = await User.create({
      name,
      email,
      phone: phone || "",
      password,
      role: "user",
      verified: true
    });

    // Generate token
    const token = generateToken(newUser);

    console.log("✅ User registered successfully:", email);

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        verified: newUser.verified
      }
    });

  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      message: "Error during signup",
      error: error.message
    });
  }
};

/* ================= MEDIATOR SIGNUP (APPLICATION) ================= */
export const mediatorSignup = async (req, res) => {
  try {
    const {
      name, email, phone, dob, password,
      languages, pincode, city, state, country,
      qualification, currentDesignation, organization, experience,
      expertise, bio, certifyInfo, agreeTerms,
    } = req.body;
    // role and approvalStatus are hardcoded below regardless of req.body — flag any attempt to override them.
    flagPrivilegeEscalationAttempt(req, "POST /auth/mediator-signup");

    const expertiseAreas = Array.isArray(expertise) ? expertise : JSON.parse(expertise || "[]");
    const languagesList   = Array.isArray(languages) ? languages : JSON.parse(languages || "[]");

    if (!name || !email || !phone || !dob || !password) {
      return res.status(400).json({ success: false, message: "Name, email, phone, date of birth and password are required" });
    }
    if (!pincode || !city) {
      return res.status(400).json({ success: false, message: "Pincode and city are required" });
    }
    if (!qualification || !experience) {
      return res.status(400).json({ success: false, message: "Highest qualification and years of experience are required" });
    }
    if (!expertiseAreas.length) {
      return res.status(400).json({ success: false, message: "Select at least one area of expertise" });
    }
    if (certifyInfo !== "true" && certifyInfo !== true) {
      return res.status(400).json({ success: false, message: "You must certify that the information provided is accurate" });
    }
    if (agreeTerms !== "true" && agreeTerms !== true) {
      return res.status(400).json({ success: false, message: "You must agree to the Terms of Service and Privacy Policy" });
    }

    const requiredDocs = ["qualificationDegree", "certification", "legalLicense", "govtId"];
    for (const field of requiredDocs) {
      if (!req.files?.[field]?.[0]) {
        return res.status(400).json({ success: false, message: `${field === "govtId" ? "Aadhaar/Passport/Driving License" : "Required document"} is missing` });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account already exists with this email" });
    }

    const newMediator = await User.create({
      name, email, phone, dob, password,
      role: "mediator",
      approvalStatus: "pending",
      languages: languagesList,
      pincode, city, state: state || "", country: country || "India",
      qualifications: qualification,
      currentDesignation: currentDesignation || "",
      organization: organization || "",
      experience: String(experience),
      expertiseAreas,
      bio: bio || "",
      verified: true,
    });

    /* Upload verification docs to NeevCloud, then attach to the mediator record */
    const verificationDocs = [];
    for (const [field, docType] of Object.entries(MEDIATOR_DOC_FIELDS)) {
      const file = req.files?.[field]?.[0];
      if (!file) continue;
      const uploaded = await uploadToNeev(file, "mediator-applications", newMediator._id);
      verificationDocs.push({ docType, fileUrl: uploaded.key, status: "pending", uploadedAt: new Date() });
    }
    newMediator.verificationDocs = verificationDocs;
    await newMediator.save();

    console.log("✅ Mediator application submitted:", email);

    sendMediatorApplicationAdminEmail({
      mediatorId: newMediator._id,
      name, email, phone,
      submittedAt: newMediator.createdAt,
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "Application submitted. Your application is under review.",
      mediator: { id: newMediator._id, name: newMediator.name, email: newMediator.email, approvalStatus: newMediator.approvalStatus },
    });
  } catch (error) {
    console.error("Mediator Signup Error:", error);
    return res.status(500).json({ success: false, message: "Error submitting application", error: error.message });
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }

    const user = await User.findOne({ email }).select("+password");
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid email or password" 
      });
    }

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account disabled. Contact administrator."
      });
    }

    if (user.role === "mediator") {
      if (user.approvalStatus === "pending") {
        return res.status(403).json({
          message: "Your mediator application is still under review.",
          approvalStatus: "pending",
        });
      }
      if (user.approvalStatus === "rejected") {
        return res.status(403).json({
          message: "Your mediator application was not approved.",
          approvalStatus: "rejected",
          approvalNote: user.approvalNote || "",
        });
      }
      // approvalStatus is "approved" at this point — still gated behind the
      // mediator-module launch flag until the portal officially goes live.
      if (!isMediatorPortalLive()) {
        return res.status(403).json({
          message: "Your application has been approved. Mediator access will be enabled when the mediator portal launches.",
          approvalStatus: "approved",
          mediatorPortalLive: false,
        });
      }
    }

    const token = generateToken(user);

    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip || req.headers["x-forwarded-for"] || "";
    await user.save();

    if (user.role === "sub-admin") {
      AdminActivityLog.create({
        subAdmin: user._id,
        actor: user._id,
        action: "login",
        description: "System Login",
      }).catch(() => {});
    }

    console.log("✅ User logged in successfully:", email);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        approvalStatus: user.approvalStatus
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ 
      message: "Error during login",
      error: error.message 
    });
  }
};

/* ================= SEND OTP FOR PASSWORD RESET ================= */
export const sendPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP
    const otpHash = await bcrypt.hash(otp, 10);

    // Save OTP to database (expires in 5 minutes)
    await Otp.findOneAndUpdate(
      { email },
      {
        email,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      },
      { upsert: true, new: true }
    );

    // Send OTP via email
    await sendOtpMail({ email, otp, type: "password-reset" });

    console.log("✅ Password reset OTP sent to:", email);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email"
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({ 
      message: "Error sending OTP",
      error: error.message 
    });
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        message: "Email and OTP are required" 
      });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Check if OTP expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(String(otp), otpRecord.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    console.log("✅ OTP verified for:", email);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ 
      message: "Error verifying OTP",
      error: error.message 
    });
  }
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        message: "Email, OTP and new password are required" 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Check if OTP expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(String(otp), otpRecord.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update user password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Delete OTP after successful reset
    await Otp.deleteMany({ email });

    console.log("✅ Password reset successful for:", email);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ 
      message: "Error resetting password",
      error: error.message 
    });
  }
};



/* =========================
   GET CURRENT USER PROFILE
========================= */
export const getMyProfile = async (req, res) => {
  try {
    // req.user comes from authMiddleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      dob: user.dob,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      country: user.country,
      pincode: user.pincode,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   UPDATE USER PROFILE
========================= */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Update fields (only if provided)
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.avatar = req.body.avatar || user.avatar;
    user.dob = req.body.dob || user.dob;
    user.gender = req.body.gender || user.gender;
    user.address = req.body.address || user.address;
    user.city = req.body.city || user.city;
    user.state = req.body.state || user.state;
    user.country = req.body.country || user.country;
    user.pincode = req.body.pincode || user.pincode;

    // ✅ Mark profile as completed if basic fields are filled
    if (user.name && user.phone && user.dob && user.gender) {
      user.profileCompleted = true;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      dob: updatedUser.dob,
      gender: updatedUser.gender,
      address: updatedUser.address,
      city: updatedUser.city,
      state: updatedUser.state,
      country: updatedUser.country,
      pincode: updatedUser.pincode,
      profileCompleted: updatedUser.profileCompleted,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Both passwords are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    const user = await User.findById(req.user._id || req.user.id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: "Current password is incorrect" });
    user.password = newPassword;
    await user.save();
    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= UPDATE NOTIFICATION PREFERENCES ================= */
export const updateNotifications = async (req, res) => {
  try {
    const { email, sms, realtime } = req.body;
    await User.findByIdAndUpdate(req.user._id || req.user.id, {
      "notifications.email":    email,
      "notifications.sms":      sms,
      "notifications.realtime": realtime,
    });
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET CURRENT USER (Protected Route) ================= */
export const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        approvalStatus: user.approvalStatus,
      }
    });

  } catch (error) {
    console.error("Get Current User Error:", error);
    return res.status(500).json({ 
      message: "Error fetching user data",
      error: error.message 
    });
  }
};