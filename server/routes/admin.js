import express from "express";
import User from "../models/User.js";
import Applicant from "../models/Applicant.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { demoDb } from "../demoData.js";

const router = express.Router();

// Get all applicants
router.get("/applicants", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    try {
      // Try MongoDB first
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
    } catch (dbError) {
      // Fallback to demo database
      console.log("⚠️ MongoDB unavailable, using demo data for applicants list");
      const applicants = demoDb.getAllApplicants();

      const formatted = applicants.map((app) => ({
        id: app.id,
        applicantId: app.applicantId,
        name: app.fullName || "N/A",
        email: app.email || "N/A",
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
    }
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

      try {
        // Try MongoDB first
        const applicant = await Applicant.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true }
        );

        res.json(applicant);
      } catch (dbError) {
        // Fallback to demo database
        console.log("⚠️ MongoDB unavailable, using demo data for status update");
        const applicants = demoDb.getAllApplicants();
        const applicant = applicants.find((a) => a.id === req.params.id);
        if (!applicant) {
          return res.status(404).json({ error: "Applicant not found" });
        }

        const updated = demoDb.updateApplicantStatus(applicant.applicantId, status);
        res.json(updated);
      }
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

      try {
        // Try MongoDB first
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
      } catch (dbError) {
        // Fallback to demo database
        console.log("⚠️ MongoDB unavailable, using demo data for service status update");
        const applicants = demoDb.getAllApplicants();
        const applicant = applicants.find((a) => a.id === req.params.id);
        if (!applicant) {
          return res.status(404).json({ error: "Applicant not found" });
        }

        const updated = demoDb.updateServiceStatus(applicant.applicantId, serviceStatus);
        res.json(updated);
      }
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

      try {
        // Try MongoDB first
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
      } catch (dbError) {
        // Fallback to demo database
        console.log("⚠️ MongoDB unavailable, using demo data for QR scan");
        const applicant = demoDb.findApplicantByApplicantId(parsed.applicantId);

        if (!applicant) {
          return res.status(404).json({ error: "Applicant not found" });
        }

        res.json({
          applicantId: applicant.applicantId,
          name: applicant.fullName,
          email: applicant.email,
          serviceStatus: applicant.serviceStatus,
          status: applicant.status,
          state: applicant.state,
          phone: applicant.phone,
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get stats
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    try {
      // Try MongoDB first
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
    } catch (dbError) {
      // Fallback to demo database
      console.log("⚠️ MongoDB unavailable, using demo data for stats");
      const stats = demoDb.getStats();

      res.json({
        total: demoDb.getAllApplicants().length,
        pending: stats.pending || 0,
        review: stats.under_review || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
