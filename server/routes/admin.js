import express from "express";
import User from "../models/User.js";
import Applicant from "../models/Applicant.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get all applicants
router.get("/applicants", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const applicants = await Applicant.find()
      .populate("userId", "email name applicantId serviceStatus")
      .sort({ createdAt: -1 });

    const formatted = applicants.map((app) => ({
      id: app._id,
      applicantId: app.applicantId,
      name: app.fullName || "N/A",
      email: app.userId?.email || "N/A",
      state: app.state || "N/A",
      status: app.status,
      serviceStatus: app.serviceStatus,
      date: app.submittedAt
        ? new Date(app.submittedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Pending",
      gender: app.gender || "N/A",
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update applicant status
router.patch(
  "/applicants/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["pending", "under_review", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const applicant = await Applicant.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      res.json(applicant);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update service status
router.patch(
  "/applicants/:id/service-status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { serviceStatus } = req.body;

      if (!["active", "dismissed", "retired"].includes(serviceStatus)) {
        return res.status(400).json({ error: "Invalid service status" });
      }

      const applicant = await Applicant.findByIdAndUpdate(
        req.params.id,
        { serviceStatus },
        { new: true }
      ).populate("userId", "email name");

      // Also update user's service status
      if (applicant.userId) {
        await User.findByIdAndUpdate(
          applicant.userId._id,
          { serviceStatus }
        );
      }

      res.json(applicant);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Parse and match scanned QR
router.post(
  "/scan-qr",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { qrPayload } = req.body;

      let parsed;
      try {
        parsed = JSON.parse(qrPayload);
      } catch {
        return res.status(400).json({ error: "Invalid QR payload format" });
      }

      if (
        !parsed.type ||
        parsed.type !== "CES_USER" ||
        !parsed.applicantId
      ) {
        return res.status(400).json({ error: "Invalid QR payload" });
      }

      const applicant = await Applicant.findOne({
        applicantId: parsed.applicantId,
      }).populate("userId", "email name applicantId serviceStatus");

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      res.json({
        applicantId: applicant.applicantId,
        name: applicant.fullName,
        email: applicant.userId?.email,
        serviceStatus: applicant.serviceStatus,
        status: applicant.status,
        state: applicant.state,
        phone: applicant.phone,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get stats
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const total = await Applicant.countDocuments();
    const pending = await Applicant.countDocuments({ status: "pending" });
    const review = await Applicant.countDocuments({ status: "under_review" });
    const approved = await Applicant.countDocuments({ status: "approved" });
    const rejected = await Applicant.countDocuments({ status: "rejected" });

    res.json({
      total,
      pending,
      review,
      approved,
      rejected,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
