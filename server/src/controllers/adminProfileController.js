import User from "../models/userModel.js";
import Case from "../models/caseModel.js";
import AdminActivityLog from "../models/adminActivityLogModel.js";
import { sanitizePermissions, countPermissions } from "../constants/permissions.js";

const RESOLVED_STATUSES = ["Resolved", "resolved", "awarded", "Closed", "closed"];

const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const logActivity = (subAdminId, actorId, action, description) =>
  AdminActivityLog.create({ subAdmin: subAdminId, actor: actorId, action, description }).catch((e) =>
    console.error("AdminActivityLog write failed:", e.message)
  );

/* ═══════════════════════════════════════════════════════
   1. GET MY PROFILE
   GET /api/admin/profile
═══════════════════════════════════════════════════════ */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ success: false, message: "Profile not found" });

    const [totalCases, resolvedAgg] = await Promise.all([
      Case.countDocuments({}),
      Case.aggregate([
        { $match: { status: { $in: RESOLVED_STATUSES }, resolvedAt: { $ne: null } } },
        { $project: { hours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60] } } },
        { $group: { _id: null, count: { $sum: 1 }, avgHours: { $avg: "$hours" } } },
      ]),
    ]);

    const resolvedCases = resolvedAgg[0]?.count || 0;
    const avgResponseHours = resolvedAgg[0]?.avgHours ?? null;

    return res.status(200).json({
      success: true,
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        username: user.username || "",
        avatar: user.avatar || "",
        isActive: user.isActive,
        twoFactorEnabled: !!user.twoFactorEnabled,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        lastLoginIP: user.lastLoginIP || "",
        initials: initials(user.name),
      },
      stats: {
        totalCases,
        resolvedCases,
        // null when there isn't enough resolved-case data to compute a real average yet
        avgResponseHours: avgResponseHours !== null ? Math.round(avgResponseHours * 10) / 10 : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   2. UPDATE MY PROFILE
   PATCH /api/admin/profile
═══════════════════════════════════════════════════════ */
export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, twoFactorEnabled } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Profile not found" });

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (typeof twoFactorEnabled === "boolean") user.twoFactorEnabled = twoFactorEnabled;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: { name: user.name, phone: user.phone, twoFactorEnabled: user.twoFactorEnabled },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   3. VERIFY PASSWORD — re-auth gate before sensitive actions
   POST /api/admin/profile/verify-password
═══════════════════════════════════════════════════════ */
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const matches = user && (await user.matchPassword(password));
    if (!matches) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    return res.status(200).json({ success: true, message: "Password verified" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   4. LIST SUB-ADMINS (paginated + stats)
   GET /api/admin/sub-admins?page=&limit=&search=
═══════════════════════════════════════════════════════ */
export const listSubAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip     = (pageNum - 1) * limitNum;

    const filter = { role: "sub-admin" };
    if (search) {
      const q = search.trim();
      filter.$or = [
        { name:     { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { email:    { $regex: q, $options: "i" } },
      ];
    }

    const [total, subAdmins, activeCount, inactiveCount] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments({ role: "sub-admin", isActive: true }),
      User.countDocuments({ role: "sub-admin", isActive: false }),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const recentlyAdded = await User.countDocuments({ role: "sub-admin", createdAt: { $gte: monthStart } });

    return res.status(200).json({
      success: true,
      total,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      page: pageNum,
      stats: {
        totalSubAdmins: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
        recentlyAdded,
      },
      subAdmins: subAdmins.map((s) => ({
        _id: s._id,
        name: s.name,
        username: s.username,
        email: s.email,
        team: s.team,
        isActive: s.isActive,
        permissionsCount: countPermissions(s.permissions),
        createdAt: s.createdAt,
        initials: initials(s.name),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   5. GET SUB-ADMIN BY ID (detail + activity log)
   GET /api/admin/sub-admins/:id
═══════════════════════════════════════════════════════ */
export const getSubAdminById = async (req, res) => {
  try {
    const subAdmin = await User.findOne({ _id: req.params.id, role: "sub-admin" }).lean();
    if (!subAdmin) return res.status(404).json({ success: false, message: "Sub-admin not found" });

    const activity = await AdminActivityLog.find({ subAdmin: subAdmin._id })
      .populate("actor", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      subAdmin: {
        _id: subAdmin._id,
        name: subAdmin.name,
        username: subAdmin.username,
        email: subAdmin.email,
        phone: subAdmin.phone || "",
        team: subAdmin.team || "",
        isActive: subAdmin.isActive,
        twoFactorEnabled: !!subAdmin.twoFactorEnabled,
        permissions: subAdmin.permissions || {},
        createdAt: subAdmin.createdAt,
        lastLoginAt: subAdmin.lastLoginAt,
        lastLoginIP: subAdmin.lastLoginIP || "",
        initials: initials(subAdmin.name),
      },
      activity: activity.map((a) => ({
        _id: a._id,
        action: a.action,
        description: a.description,
        actorName: a.actor?.name || "System",
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   6. CREATE SUB-ADMIN
   POST /api/admin/sub-admins
═══════════════════════════════════════════════════════ */
export const createSubAdmin = async (req, res) => {
  try {
    const { fullName, username, email, password, confirmPassword, team, permissions } = req.body;

    if (!fullName?.trim() || !username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Full name, username, email, and password are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const cleanPermissions = sanitizePermissions(permissions);
    if (countPermissions(cleanPermissions) === 0) {
      return res.status(400).json({ success: false, message: "Select at least one permission" });
    }

    const [emailTaken, usernameTaken] = await Promise.all([
      User.findOne({ email: email.trim().toLowerCase() }),
      User.findOne({ username: username.trim() }),
    ]);
    if (emailTaken) return res.status(400).json({ success: false, message: "Email already in use" });
    if (usernameTaken) return res.status(400).json({ success: false, message: "Username already taken" });

    const subAdmin = await User.create({
      name: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "sub-admin",
      team: team?.trim() || "Operations Team",
      permissions: cleanPermissions,
      createdBy: req.user._id,
      verified: true,
    });

    await logActivity(subAdmin._id, req.user._id, "created", `Sub-admin account created by ${req.user.name}`);

    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      subAdmin: {
        _id: subAdmin._id,
        name: subAdmin.name,
        username: subAdmin.username,
        email: subAdmin.email,
        team: subAdmin.team,
        isActive: subAdmin.isActive,
        permissionsCount: countPermissions(subAdmin.permissions),
        createdAt: subAdmin.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   7. UPDATE SUB-ADMIN PERMISSIONS
   PATCH /api/admin/sub-admins/:id/permissions
═══════════════════════════════════════════════════════ */
export const updateSubAdminPermissions = async (req, res) => {
  try {
    const subAdmin = await User.findOne({ _id: req.params.id, role: "sub-admin" });
    if (!subAdmin) return res.status(404).json({ success: false, message: "Sub-admin not found" });

    const cleanPermissions = sanitizePermissions(req.body.permissions);
    if (countPermissions(cleanPermissions) === 0) {
      return res.status(400).json({ success: false, message: "Select at least one permission" });
    }

    subAdmin.permissions = cleanPermissions;
    await subAdmin.save();

    await logActivity(subAdmin._id, req.user._id, "permissions_updated", `Permissions updated by ${req.user.name}`);

    return res.status(200).json({ success: true, message: "Permissions updated", permissions: subAdmin.permissions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   8. TOGGLE SUB-ADMIN STATUS (enable/disable)
   PATCH /api/admin/sub-admins/:id/status
═══════════════════════════════════════════════════════ */
export const toggleSubAdminStatus = async (req, res) => {
  try {
    const subAdmin = await User.findOne({ _id: req.params.id, role: "sub-admin" });
    if (!subAdmin) return res.status(404).json({ success: false, message: "Sub-admin not found" });

    const nextActive = typeof req.body.isActive === "boolean" ? req.body.isActive : !subAdmin.isActive;
    subAdmin.isActive = nextActive;
    subAdmin.suspendedAt = nextActive ? null : new Date();
    subAdmin.suspendedReason = nextActive ? "" : (req.body.reason || "Disabled by administrator");
    await subAdmin.save();

    await logActivity(
      subAdmin._id,
      req.user._id,
      nextActive ? "enabled" : "disabled",
      `Account ${nextActive ? "enabled" : "disabled"} by ${req.user.name}`
    );

    return res.status(200).json({
      success: true,
      message: `Sub-admin ${nextActive ? "enabled" : "disabled"}`,
      isActive: subAdmin.isActive,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   9. DELETE SUB-ADMIN
   DELETE /api/admin/sub-admins/:id
═══════════════════════════════════════════════════════ */
export const deleteSubAdmin = async (req, res) => {
  try {
    const subAdmin = await User.findOneAndDelete({ _id: req.params.id, role: "sub-admin" });
    if (!subAdmin) return res.status(404).json({ success: false, message: "Sub-admin not found" });

    await AdminActivityLog.deleteMany({ subAdmin: subAdmin._id });

    return res.status(200).json({ success: true, message: "Sub-admin removed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   10. PLATFORM-WIDE ACTIVITY LOGS (Activity Logs tab)
   GET /api/admin/activity-logs?page=&limit=
═══════════════════════════════════════════════════════ */
export const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      AdminActivityLog.countDocuments({}),
      AdminActivityLog.find({})
        .populate("subAdmin", "name")
        .populate("actor", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      total,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      page: pageNum,
      logs: logs.map((l) => ({
        _id: l._id,
        action: l.action,
        description: l.description,
        subAdminName: l.subAdmin?.name || "Deleted account",
        actorName: l.actor?.name || "System",
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
