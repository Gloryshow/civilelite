import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load user from DB so routes have full user info (id, email, role, applicantId, etc.)
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ error: "Invalid token user" });

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      applicantId: user.applicantId,
      serviceStatus: user.serviceStatus,
      legacyApproved: user.legacyApproved || false,
      registrationStatus: user.registrationStatus,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error', error);
    res.status(401).json({ error: "Invalid token" });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};
