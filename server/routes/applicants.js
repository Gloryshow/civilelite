import express from "express";
import Applicant from "../models/Applicant.js";
import User from "../models/User.js";
import Announcement from "../models/Announcement.js";
import Setting from "../models/Setting.js";
import { authMiddleware } from "../middleware/auth.js";
import QRCode from "qrcode";
import archiver from "archiver";

const router = express.Router();

// Public QR verification lookup
router.get("/verify/:applicantId", async (req, res) => {
  try {
    const applicant = await Applicant.findOne({ applicantId: req.params.applicantId })
      .populate("userId", "email name applicantId serviceStatus");

    if (!applicant) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    res.json({
      applicantId: applicant.applicantId,
      fullName: applicant.fullName || "",
      email: applicant.userId?.email || "",
      phone: applicant.phone || "",
      gender: applicant.gender || "",
      bloodGroup: applicant.bloodGroup || "",
      genotype: applicant.genotype || "",
      status: applicant.status,
      serviceStatus: applicant.serviceStatus,
      paramilitaryRank: applicant.paramilitaryRank || "",
      paramilitaryPost: applicant.paramilitaryPost || "",
      submittedAt: applicant.submittedAt || null,
      updatedAt: applicant.updatedAt || null,
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Get applicant profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    let applicant = await Applicant.findOne({ userId: req.user.id });

    if (!applicant) {
      applicant = {
        userId: req.user.id,
        applicantId: req.user.applicantId,
        fullName: "",
        email: req.user.email,
        phone: "",
        gender: "",
        dob: "",
        religion: "",
        maritalStatus: "",
        placeOfBirth: "",
        height: "",
        bloodGroup: "",
        genotype: "",
        urinaryTest: "",
        generalAptitudeScore: "",
        vocationalAptitudeScore: "",
        oralTestScore: "",
        documentsPresented: "",
        remarks: "",
        eliteAdminOfficerName: "",
        eliteAdminOfficerPortfolio: "",
        eliteAdminOfficerSignatureDate: "",
        directorateName: "",
        directoratePortfolio: "",
        directorateSignatureDate: "",
        nationality: "",
        profession: "",
        professionAddress: "",
        educationQualification: "",
        disability: "",
        convictedBefore: "",
        convictionReasons: "",
        paramilitaryMember: "",
        paramilitaryName: "",
        paramilitaryRank: "",
        paramilitaryPost: "",
        paramilitaryYears: "",
        leavingReasons: "",
        declarationName: "",
        declarationDate: "",
        passportPhotoDataUrl: "",
        guardianName: "",
        guardianSignatureDate: "",
        witnessName: "",
        witnessSignatureDate: "",
        state: "",
        lga: "",
        address: "",
        qualification: "",
        kinName: "",
        kinPhone: "",
        medInfo: "",
        whyJoin: "",
        status: "pending",
        serviceStatus: req.user.serviceStatus,
        submitted: false,
      };
    }

    res.json(applicant);
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Submit/Update application
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const {
      fullName,
      phone,
      gender,
      dob,
      bloodGroup,
      genotype,
      urinaryTest,
      religion,
      maritalStatus,
      placeOfBirth,
      height,
      nationality,
      profession,
      professionAddress,
      educationQualification,
      disability,
      convictedBefore,
      convictionReasons,
      paramilitaryMember,
      paramilitaryName,
      paramilitaryRank,
      paramilitaryPost,
      paramilitaryYears,
      leavingReasons,
      declarationName,
      declarationDate,
      passportPhotoDataUrl,
      guardianName,
      guardianSignatureDate,
      witnessName,
      witnessSignatureDate,
      state,
      lga,
      address,
      qualification,
      kinName,
      kinPhone,
      medInfo,
      whyJoin,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !gender ||
      !state ||
      !lga ||
      !dob ||
      !qualification
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let applicant = await Applicant.findOne({ userId: req.user.id });

    if (!applicant) {
      applicant = new Applicant({
        userId: req.user.id,
        applicantId: req.user.applicantId,
      });
    }

    applicant.fullName = fullName;
    applicant.phone = phone;
    applicant.gender = gender;
    applicant.dob = dob;
    applicant.bloodGroup = bloodGroup;
    applicant.genotype = genotype;
    applicant.urinaryTest = urinaryTest;
    applicant.religion = religion;
    applicant.maritalStatus = maritalStatus;
    applicant.placeOfBirth = placeOfBirth;
    applicant.height = height;
    applicant.nationality = nationality;
    applicant.profession = profession;
    applicant.professionAddress = professionAddress;
    applicant.educationQualification = educationQualification;
    applicant.disability = disability;
    applicant.convictedBefore = convictedBefore;
    applicant.convictionReasons = convictionReasons;
    applicant.paramilitaryMember = paramilitaryMember;
    applicant.paramilitaryName = paramilitaryName;
    applicant.paramilitaryRank = paramilitaryRank;
    applicant.paramilitaryPost = paramilitaryPost;
    applicant.paramilitaryYears = paramilitaryYears;
    applicant.leavingReasons = leavingReasons;
    applicant.declarationName = declarationName;
    applicant.declarationDate = declarationDate;
    applicant.passportPhotoDataUrl = passportPhotoDataUrl;
    applicant.guardianName = guardianName;
    applicant.guardianSignatureDate = guardianSignatureDate;
    applicant.witnessName = witnessName;
    applicant.witnessSignatureDate = witnessSignatureDate;
    applicant.state = state;
    applicant.lga = lga;
    applicant.address = address;
    applicant.qualification = qualification;
    applicant.kinName = kinName;
    applicant.kinPhone = kinPhone;
    applicant.medInfo = medInfo;
    applicant.whyJoin = whyJoin;
    applicant.status = "under_review";
    applicant.submitted = true;
    applicant.submittedAt = new Date();

    await applicant.save();

    res.json({
      message: "Application submitted successfully",
      applicant,
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// List announcements for applicants
router.get("/announcements", authMiddleware, async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 });
    res.json(
      items.map((a) => ({
        id: a._id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Public manual payment settings
router.get("/settings", async (req, res) => {
  try {
    let s = await Setting.findOne();
    if (!s) {
      s = await Setting.create({});
    }

    res.json({
      recruitmentOpen: s.recruitmentOpen,
      manualPayment: {
        enabled: s.manualPayment?.enabled ?? true,
        feeAmount: s.manualPayment?.feeAmount ?? 5000,
        currency: s.manualPayment?.currency || "NGN",
        bankName: s.manualPayment?.bankName || "",
        accountName: s.manualPayment?.accountName || "",
        accountNumber: s.manualPayment?.accountNumber || "",
        bankBranch: s.manualPayment?.bankBranch || "",
        receiptRequirement:
          s.manualPayment?.receiptRequirement ||
          "Come to camp with your payment receipt for verification.",
        note:
          s.manualPayment?.note ||
          "Paystack and Flutterwave are not enabled yet.",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: "Database unavailable" });
  }
});

  // Generate QR code for single applicant (admin only)
  router.get("/admin/qr-code/:applicantId", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const applicant = await Applicant.findOne({ applicantId: req.params.applicantId });
      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      if (applicant.status !== "approved") {
        return res.status(400).json({ error: "Only approved applicants can have QR codes" });
      }

      // Generate QR code containing verification URL
      const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const verificationUrl = `${baseUrl}/verify/${applicant.applicantId}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl);

      res.json({ qrDataUrl });
    } catch (error) {
      console.error(error);
      res.status(503).json({ error: "Failed to generate QR code" });
    }
  });

  // Bulk download QR codes for all approved applicants (admin only)
  router.get("/admin/qr-codes/download", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const approvedApplicants = await Applicant.find({ status: "approved" });

      if (approvedApplicants.length === 0) {
        return res.status(400).json({ error: "No approved applicants found" });
      }

      const archive = archiver("zip", { zlib: { level: 9 } });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="qr-codes.zip"');

      archive.pipe(res);

      const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";

      for (const applicant of approvedApplicants) {
        const verificationUrl = `${baseUrl}/verify/${applicant.applicantId}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl);
        const buffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
        archive.append(buffer, { name: `${applicant.applicantId}-qr.png` });
      }

      await archive.finalize();
    } catch (error) {
      console.error(error);
      res.status(503).json({ error: "Failed to generate QR codes" });
    }
  });

export default router;
