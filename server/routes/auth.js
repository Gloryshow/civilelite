import express from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import User from "../models/User.js";
import { demoDb } from "../demoData.js";

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

    try {
      // Try MongoDB first
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
    } catch (dbError) {
      // Fallback to demo database
      console.log("⚠️ MongoDB unavailable, using demo data for registration");
      const existing = demoDb.findUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }

      const applicantId = `CES-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Demo fallback: handle admin vs applicant
      const isAdmin = (role === 'admin');
      const user = demoDb.createUser({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: isAdmin ? 'admin' : 'applicant',
        applicantId,
        serviceStatus: "active",
        registrationStatus: isAdmin ? 'pending' : 'approved',
      });

      if (isAdmin) {
        res.json({
          message: "Admin registration submitted and is pending admin approval",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            applicantId: user.applicantId,
            serviceStatus: user.serviceStatus,
            registrationStatus: user.registrationStatus,
          },
        });
      } else {
        const token = generateToken(user.id, user.role);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, applicantId: user.applicantId, serviceStatus: user.serviceStatus, registrationStatus: user.registrationStatus } });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
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

    try {
      // Try MongoDB first
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
    } catch (dbError) {
      // Fallback to demo database
      console.log("⚠️ MongoDB unavailable, using demo data for login");
      const user = demoDb.findUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcryptjs.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user.id, user.role);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          applicantId: user.applicantId,
          serviceStatus: user.serviceStatus,
        },
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
