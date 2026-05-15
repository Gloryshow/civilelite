import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import Applicant from "../models/Applicant.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";
import { sendMail } from "../utils/mailer.js";

const router = express.Router();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

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

    // Send notifications
    try {
      const adminRecipients = (process.env.ADMIN_EMAILS || process.env.FROM_EMAIL || "").split(",").map(s => s.trim()).filter(Boolean);

      if (isAdmin) {
        // Notify admins about pending admin registration
        if (adminRecipients.length) {
          await sendMail({
            to: adminRecipients.join(','),
            subject: `New admin registration pending: ${user.name}`,
            html: `<p>An admin account has been registered and requires approval.</p>
                   <p><strong>Name:</strong> ${user.name}</p>
                   <p><strong>Email:</strong> ${user.email}</p>
                   <p><strong>Applicant ID:</strong> ${user.applicantId}</p>`
          });
        }

        // Acknowledge to the registrant
        await sendMail({
          to: user.email,
          subject: "Admin registration received",
          html: `<p>Thanks ${user.name},</p><p>Your admin registration has been received and is pending approval. We will notify you when an administrator reviews your request.</p>`
        });

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

        // Welcome email to applicant
        try {
          await sendMail({
            to: user.email,
            subject: "Welcome to Civil Elite Service",
            html: `<p>Welcome ${user.name},</p><p>Your application account has been created. Your applicant ID is <strong>${user.applicantId}</strong>. Use this account to track your application.</p>`
          });
        } catch (err) {
          console.error('Failed to send welcome email:', err);
        }

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
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
      // Continue gracefully even if emails fail
      if (isAdmin) {
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

// Request password reset - verifies the account with both applicant ID and phone, then updates the password.
router.post("/forgot", async (req, res) => {
  try {
    const { email, applicantId = "", phone = "", newPassword } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }

    const normalizedApplicantId = String(applicantId || "").trim().toLowerCase();
    const storedApplicantId = String(user.applicantId || "").trim().toLowerCase();
    const applicantIdMatched = normalizedApplicantId && storedApplicantId && normalizedApplicantId === storedApplicantId;

    let phoneMatched = false;
    const normalizedPhone = normalizeDigits(phone);
    if (normalizedPhone) {
      const applicant = await Applicant.findOne({ userId: user._id }).lean();
      const storedPhone = normalizeDigits(applicant?.phone || "");
      phoneMatched = storedPhone && (storedPhone.includes(normalizedPhone) || normalizedPhone.includes(storedPhone));
    }

    if (!applicantIdMatched || !phoneMatched) {
      return res.status(400).json({ error: "Verification failed. Provide a matching applicant ID and phone number." });
    }

    user.password = newPassword;
    await user.save();

    // Send password-change notification
    try {
      await sendMail({
        to: user.email,
        subject: 'Your password has been changed',
        html: `<p>Hello ${user.name || user.email},</p><p>Your account password was successfully updated. If you did not perform this action, please contact portal support immediately.</p>`
      });
    } catch (err) {
      console.error('Failed to send password change email:', err);
    }

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Unable to reset password" });
  }
});
