// import jwt from "jsonwebtoken";
// import User from "../models/userModel.js";

// // Protect routes
// export const protect = async (req, res, next) => {
//   let token;
//   if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
//     try {
//       token = req.headers.authorization.split(" ")[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await User.findById(decoded.id).select("-password");
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: "Not authorized, token failed" });
//     }
//   } else {
//     return res.status(401).json({ message: "Not authorized, no token" });
//   }
// };

// // Role-based authorization
// export const authorizeRoles = (roles) => {
//   return (req, res, next) => {
//     if (!req.user) return res.status(401).json({ message: "Not authorized" });
//     if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden: Insufficient role" });
//     next();
//   };
// };

// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
