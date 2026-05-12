import express from "express";
import User from "../models/User.js";
import Applicant from "../models/Applicant.js";
import Announcement from "../models/Announcement.js";
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
      fullName: app.fullName || "N/A",
      phone: app.phone || "N/A",
      gender: app.gender || "N/A",
      bloodGroup: app.bloodGroup || "",
      genotype: app.genotype || "",
      urinaryTest: app.urinaryTest || "",
      generalAptitudeScore: app.generalAptitudeScore || "",
      vocationalAptitudeScore: app.vocationalAptitudeScore || "",
      oralTestScore: app.oralTestScore || "",
      documentsPresented: app.documentsPresented || "",
      remarks: app.remarks || "",
      eliteAdminOfficerName: app.eliteAdminOfficerName || "",
      eliteAdminOfficerPortfolio: app.eliteAdminOfficerPortfolio || "",
      eliteAdminOfficerSignatureDate: app.eliteAdminOfficerSignatureDate || "",
      directorateName: app.directorateName || "",
      directoratePortfolio: app.directoratePortfolio || "",
      directorateSignatureDate: app.directorateSignatureDate || "",
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
    res.status(503).json({ error: "Database unavailable" });
  }
});

// List pending user registrations
router.get("/registrations", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ registrationStatus: "pending" }).sort({ createdAt: -1 });
    res.json(users.map(u => ({ id: u._id, email: u.email, name: u.name, applicantId: u.applicantId, createdAt: u.createdAt })));
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Approve registration
router.post("/registrations/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { registrationStatus: "approved" }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User approved", user });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Reject registration
router.post("/registrations/:id/reject", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { registrationStatus: "rejected" }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User rejected", user });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
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

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      res.json(applicant);
    } catch (error) {
      console.error(error);
      res.status(503).json({ error: "Database unavailable" });
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

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

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
      res.status(503).json({ error: "Database unavailable" });
    }
  }
);

router.patch(
  "/applicants/:id/assessment",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const applicant = await Applicant.findById(req.params.id);

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      const fields = [
        "bloodGroup",
        "genotype",
        "urinaryTest",
        "generalAptitudeScore",
        "vocationalAptitudeScore",
        "oralTestScore",
        "documentsPresented",
        "remarks",
        "eliteAdminOfficerName",
        "eliteAdminOfficerPortfolio",
        "eliteAdminOfficerSignatureDate",
        "directorateName",
        "directoratePortfolio",
        "directorateSignatureDate",
      ];

      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          applicant[field] = req.body[field];
        }
      });

      await applicant.save();

      res.json({
        id: applicant._id,
        applicantId: applicant.applicantId,
        bloodGroup: applicant.bloodGroup,
        genotype: applicant.genotype,
        urinaryTest: applicant.urinaryTest,
        generalAptitudeScore: applicant.generalAptitudeScore,
        vocationalAptitudeScore: applicant.vocationalAptitudeScore,
        oralTestScore: applicant.oralTestScore,
        documentsPresented: applicant.documentsPresented,
        remarks: applicant.remarks,
        eliteAdminOfficerName: applicant.eliteAdminOfficerName,
        eliteAdminOfficerPortfolio: applicant.eliteAdminOfficerPortfolio,
        eliteAdminOfficerSignatureDate: applicant.eliteAdminOfficerSignatureDate,
        directorateName: applicant.directorateName,
        directoratePortfolio: applicant.directoratePortfolio,
        directorateSignatureDate: applicant.directorateSignatureDate,
      });
    } catch (error) {
      console.error(error);
      res.status(503).json({ error: "Database unavailable" });
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
        fullName: applicant.fullName,
        name: applicant.fullName,
        email: applicant.userId?.email,
        phone: applicant.phone,
        gender: applicant.gender,
        bloodGroup: applicant.bloodGroup,
        genotype: applicant.genotype,
        urinaryTest: applicant.urinaryTest,
        generalAptitudeScore: applicant.generalAptitudeScore,
        vocationalAptitudeScore: applicant.vocationalAptitudeScore,
        oralTestScore: applicant.oralTestScore,
        documentsPresented: applicant.documentsPresented,
        remarks: applicant.remarks,
        eliteAdminOfficerName: applicant.eliteAdminOfficerName,
        eliteAdminOfficerPortfolio: applicant.eliteAdminOfficerPortfolio,
        eliteAdminOfficerSignatureDate: applicant.eliteAdminOfficerSignatureDate,
        directorateName: applicant.directorateName,
        directoratePortfolio: applicant.directoratePortfolio,
        directorateSignatureDate: applicant.directorateSignatureDate,
        state: applicant.state,
        lga: applicant.lga,
        serviceStatus: applicant.serviceStatus,
        status: applicant.status,
      });
    } catch (error) {
      console.error(error);
      res.status(503).json({ error: "Database unavailable" });
    }
  }
);

// Get stats
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const total = await Applicant.countDocuments();
    const pending = await User.countDocuments({
      role: "admin",
      registrationStatus: "pending",
    });
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
    res.status(503).json({ error: "Database unavailable" });
  }
});

// List announcements
router.get("/announcements", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const items = await Announcement.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(
      items.map((a) => ({
        id: a._id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
        createdBy: a.createdBy
          ? { id: a.createdBy._id, name: a.createdBy.name, email: a.createdBy.email }
          : null,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Create announcement
router.post("/announcements", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      body: body.trim(),
      createdBy: req.user.id,
    });

    res.status(201).json({
      id: announcement._id,
      title: announcement.title,
      body: announcement.body,
      createdAt: announcement.createdAt,
      createdBy: req.user.id,
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
