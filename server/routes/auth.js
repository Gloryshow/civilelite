import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register
router.post("/register", async (req, res) => {
  try {
      const { email, password, name, role = 'applicant' } = req.body;

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Email, password, and name are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Generate unique applicant ID
    const applicantId = `CES-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;

    // If registering as admin, require approval. Applicants are auto-approved.
    const isAdmin = role === 'admin';
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      role: isAdmin ? 'admin' : 'applicant',
      applicantId,
      serviceStatus: "active",
      registrationStatus: isAdmin ? 'pending' : 'approved',
    });

    await user.save();

    if (isAdmin) {
      // Do not auto-issue token for admin - pending approval
      res.json({
        message: "Admin registration submitted and is pending admin approval",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          applicantId: user.applicantId,
          serviceStatus: user.serviceStatus,
          registrationStatus: user.registrationStatus,
        },
      });
    } else {
      // Applicants auto-approved - issue token immediately
      const token = generateToken(user._id, user.role);
      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          applicantId: user.applicantId,
          serviceStatus: user.serviceStatus,
          registrationStatus: user.registrationStatus,
        },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Prevent login if registration is pending or rejected
    if (user.registrationStatus !== "approved") {
      return res.status(403).json({ error: "Account not approved by admin" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        applicantId: user.applicantId,
        serviceStatus: user.serviceStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Current authenticated user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        applicantId: req.user.applicantId,
        serviceStatus: req.user.serviceStatus,
        registrationStatus: req.user.registrationStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;

// ---------------------------------------------------------------------------
// Password reset (Forgot password) routes
// ---------------------------------------------------------------------------

// Request password reset - generates a one-time token saved on user and returns success.
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ message: "If that account exists, a reset link has been sent." });

    const token = crypto.randomBytes(24).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    // In a real app, send this link via email. For now we log it so deployers can copy it.
    const resetLink = `${(process.env.FRONTEND_URL || "http://localhost:3000")}/reset-password/${token}`;
    console.log(`Password reset requested for ${user.email}. Reset link: ${resetLink}`);

    res.json({ message: "If that account exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Unable to process request" });
  }
});

// Reset password using token
router.post("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "New password is required" });

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Unable to reset password" });
  }
});
