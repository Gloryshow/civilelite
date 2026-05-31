import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import Applicant from "../models/Applicant.js";
import User from "../models/User.js";
import LegacyClaim from "../models/LegacyClaim.js";
import { authMiddleware } from "../middleware/auth.js";
import { sendMail } from "../utils/mailer.js";
import { getPushPublicKey, isPushEnabled, sendPushToRole } from "../utils/push.js";

const router = express.Router();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const normalizeSubscription = (subscription = {}) => {
  const endpoint = String(subscription.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    keys: { p256dh, auth },
  };
};

router.get("/push/public-key", (req, res) => {
  if (!isPushEnabled()) {
    return res.status(503).json({ error: "Push notifications are not configured" });
  }
  return res.json({ publicKey: getPushPublicKey() });
});

router.post("/push/subscribe", authMiddleware, async (req, res) => {
  try {
    if (!isPushEnabled()) {
      return res.status(503).json({ error: "Push notifications are not configured" });
    }

    const parsed = normalizeSubscription(req.body?.subscription || req.body);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid push subscription" });
    }

    await User.updateMany(
      { _id: { $ne: req.user.id }, "pushSubscriptions.endpoint": parsed.endpoint },
      { $pull: { pushSubscriptions: { endpoint: parsed.endpoint } } }
    );

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existing = (user.pushSubscriptions || []).find((s) => s.endpoint === parsed.endpoint);
    if (existing) {
      existing.keys = parsed.keys;
      existing.expirationTime = parsed.expirationTime;
      existing.lastSeenAt = new Date();
      existing.userAgent = String(req.headers["user-agent"] || "").slice(0, 200);
    } else {
      user.pushSubscriptions.push({
        ...parsed,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
        createdAt: new Date(),
        lastSeenAt: new Date(),
      });
    }

    await user.save();
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ error: "Unable to save push subscription" });
  }
});

router.post("/push/unsubscribe", authMiddleware, async (req, res) => {
  try {
    const endpoint = String(req.body?.endpoint || "").trim();
    if (!endpoint) return res.status(400).json({ error: "Subscription endpoint is required" });

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { pushSubscriptions: { endpoint } } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ error: "Unable to remove push subscription" });
  }
});

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
    // Helper to create a nicely formatted adminId: ADM-<YEAR>-<6 digits>
    const createAdminId = (seq) => {
      const year = new Date().getFullYear();
      if (typeof seq === 'number') return `ADM-${year}-${String(seq).padStart(6, '0')}`;
      const suffix = String(Date.now() % 1000000).padStart(6, '0');
      return `ADM-${year}-${suffix}`;
    };
    // Generate an adminId for admin accounts (persisted). For newly created admins
    // use a time-based 6-digit suffix as a fast fallback; migration will replace
    // missing adminIds with sequential values when run.
    const adminId = createAdminId();

    // Normalize role from client and constrain to known values.
    const normalizedRole = String(role || "applicant").toLowerCase();
    const isAdmin = normalizedRole === "admin";
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      role: isAdmin ? 'admin' : 'applicant',
      applicantId,
      adminId: isAdmin ? adminId : undefined,
      serviceStatus: "active",
      registrationStatus: isAdmin ? 'pending' : 'approved',
    });

    await user.save();

    // Ensure newly registered applicants appear in admin listings immediately,
    // even before completing the full application form. Assign a sequential
    // serial number when creating the Applicant document.
    if (!isAdmin) {
      const existing = await Applicant.findOne({ userId: user._id });
      if (!existing) {
        // assign serial atomically
        const { getNextSequence } = await import("../utils/sequence.js");
        const serial = await getNextSequence("applicant");
        await Applicant.create({
          userId: user._id,
          applicantId: user.applicantId,
          fullName: user.name,
          email: user.email,
          status: "under_review",
          serviceStatus: user.serviceStatus,
          submitted: false,
          serial,
        });
      }
    }

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

// Legacy officer claim submission (self-service, admin-approved)
router.post("/legacy-claim", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      state = "",
      dob = "",
      legacyServiceNumber,
      lastUnit = "",
      approvalYear = null,
    } = req.body || {};

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        error:
          "Name, email, password, and phone are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: "An account already exists for this email" });
    }

    const applicantId = `CES-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
    const user = await User.create({
      email: normalizedEmail,
      password,
      name: String(name).trim(),
      role: "applicant",
      applicantId,
      serviceStatus: "active",
      registrationStatus: "pending",
      legacyApproved: true,
    });

    const existingApplicant = await Applicant.findOne({ userId: user._id });
    if (!existingApplicant) {
      const { getNextSequence } = await import("../utils/sequence.js");
      const serial = await getNextSequence("applicant");
      await Applicant.create({
        userId: user._id,
        applicantId: user.applicantId,
        fullName: user.name,
        email: user.email,
        phone: String(phone).trim(),
        state: String(state || "").trim(),
        dob: String(dob || "").trim(),
        status: "under_review",
        submitted: true,
        submittedAt: new Date(),
        serial,
      });
    }

    await LegacyClaim.create({
      userId: user._id,
      applicantId: user.applicantId,
      fullName: String(name).trim(),
      email: user.email,
      phone: String(phone).trim(),
      state: String(state || "").trim(),
      dob: String(dob || "").trim(),
      legacyServiceNumber: String(legacyServiceNumber || "").trim(),
      lastUnit: String(lastUnit || "").trim(),
      approvalYear: approvalYear ? Number(approvalYear) : null,
      status: "pending",
    });

    await sendPushToRole(
      "admin",
      {
        title: "New Existing Officer Claim",
        body: `${user.name} submitted an existing officer claim for review.`,
        url: "/",
        tag: "existing-claim-submitted",
      },
      { registrationStatus: "approved" }
    );

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      message: "Claim submitted. You can now complete the legacy update form.",
      applicantId: user.applicantId,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        applicantId: user.applicantId,
        serviceStatus: user.serviceStatus,
        registrationStatus: user.registrationStatus,
        legacyApproved: true,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Unable to submit legacy claim" });
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

    // Allow legacy claimers to log in while they are in the update/approval flow.
    if (user.registrationStatus !== "approved" && !user.legacyApproved) {
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
        legacyApproved: user.legacyApproved || false,
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
        legacyApproved: req.user.legacyApproved || false,
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
