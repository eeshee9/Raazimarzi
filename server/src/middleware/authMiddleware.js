import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { isMediatorPortalLive } from "../utils/featureFlags.js";

// 🔐 Protect routes
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (req.user && req.user.isActive === false) {
        return res.status(403).json({ message: "Account disabled. Contact administrator." });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

// 🔐 Role-based authorization
export const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient role" });
    }

    next();
  };
};

// 🔐 Mediator-portal launch gate — apply AFTER authorizeRoles(["mediator", ...])
// on any route that grants mediator-role access. Re-checks approval status
// and the launch flag on every request (not just at login), so an older
// still-valid token can't be used to reach mediator routes either before
// approval, after a later rejection, or before the portal officially
// launches. Non-mediator roles that already passed authorizeRoles (e.g.
// admin) pass straight through untouched.
export const gateMediatorPortal = (req, res, next) => {
  if (!req.user || req.user.role !== "mediator") return next();

  if (req.user.isActive === false) {
    return res.status(403).json({ message: "Account disabled. Contact administrator." });
  }

  if (req.user.approvalStatus !== "approved") {
    return res.status(403).json({
      message: req.user.approvalStatus === "rejected"
        ? "Your mediator application was not approved."
        : "Your mediator application is still under review.",
      approvalStatus: req.user.approvalStatus,
    });
  }

  if (!isMediatorPortalLive()) {
    return res.status(403).json({
      message: "Your application has been approved. Mediator access will be enabled when the mediator portal launches.",
      approvalStatus: "approved",
      mediatorPortalLive: false,
    });
  }

  return next();
};

export default protect;
