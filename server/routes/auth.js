import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const createResetCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createMailer = () => {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
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

// Request password reset - generates a one-time code, stores a hash, and emails it.
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ message: "If that account exists, a reset code has been sent." });

    const mailer = createMailer();
    if (!mailer) {
      return res.status(503).json({
        error: "Email service is not configured. Set SMTP_URL or SMTP_HOST/SMTP_USER/SMTP_PASS.",
      });
    }

    const code = createResetCode();
    user.resetPasswordToken = hashCode(code);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@civil-elite.local";
    const portalUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    await mailer.sendMail({
      from,
      to: user.email,
      subject: "Civil Elite Service password reset code",
      text: `Your password reset code is ${code}. It expires in 15 minutes.\n\nIf you did not request this, ignore this email.\n\nPortal: ${portalUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 12px">Civil Elite Service password reset code</h2>
          <p>Your one-time code is:</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f8fafc;padding:16px 20px;display:inline-block;border-radius:8px;border:1px solid #e2e8f0">${code}</div>
          <p style="margin-top:16px">This code expires in 15 minutes.</p>
          <p>If you did not request this, ignore this email.</p>
          <p><a href="${portalUrl}" style="color:#c9952a">Open the portal</a></p>
        </div>
      `,
    });

    res.json({ message: "If that account exists, a reset code has been sent." });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Unable to process request" });
  }
});

// Reset password using the emailed code
router.post("/reset", async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashCode(code),
      resetPasswordExpires: { $gt: new Date() },
    });
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
