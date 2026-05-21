// server/src/middleware/cmsMiddleware.js
import jwt from "jsonwebtoken";

const CMS_JWT_SECRET = process.env.CMS_JWT_SECRET || "cms-secret-change-in-prod";

export const cmsAuthMiddleware = (req, res, next) => {
  try {
    const token =
      req.cookies?.cms_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "CMS authentication required" });
    }

    const decoded = jwt.verify(token, CMS_JWT_SECRET);
    req.cmsUser   = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired CMS session" });
  }
};

export const cmsManagerOnly = (req, res, next) => {
  if (!["seo_manager", "admin"].includes(req.cmsUser?.role)) {
    return res.status(403).json({ message: "SEO Manager role required" });
  }
  next();
};