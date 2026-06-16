import express from "express";
import Applicant from "../models/Applicant.js";
import User from "../models/User.js";
import Announcement from "../models/Announcement.js";
import Setting from "../models/Setting.js";
import { authMiddleware } from "../middleware/auth.js";
import { restrictPendingLegacy } from "../middleware/legacyAccess.js";
import { sendPushToRole } from "../utils/push.js";

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
        phone2: "",
        email2: "",
        contactAddress: "",
        age: "",
        schoolOccupation: "",
        homeTown: "",
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
        guarantorPassportPhotoDataUrl: "",
        birthCertificateDataUrl: "",
        schoolCertificateDataUrl: "",
        attestationLetterDataUrl: "",
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
        parentName: "",
        parentContactAddress: "",
        parentOccupation: "",
        parentPhone1: "",
        parentPhone2: "",
        parentEmail: "",
        parentSignature: "",
        status: "under_review",
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
      email,
      phone,
      phone2,
      email2,
      contactAddress,
      age,
      schoolOccupation,
      homeTown,
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
      guarantorPassportPhotoDataUrl,
      birthCertificateDataUrl,
      schoolCertificateDataUrl,
      attestationLetterDataUrl,
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
      serviceStatus,
      serviceNumber,
      department,
      parentName,
      parentContactAddress,
      parentOccupation,
      parentPhone1,
      parentPhone2,
      parentEmail,
      parentSignature,
    } = req.body;

    const isLegacyUpdate = Boolean(req.user.legacyApproved);
    if (isLegacyUpdate) {
      if (!fullName || !phone || !gender || !state || !lga || !contactAddress || !age || !serviceStatus) {
        return res.status(400).json({ error: "Missing required legacy update fields" });
      }
    } else if (
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
      // Create new applicant and assign sequential serial
      const { getNextSequence } = await import("../utils/sequence.js");
      const serial = await getNextSequence("applicant");
      applicant = new Applicant({
        userId: req.user.id,
        applicantId: req.user.applicantId,
        serial,
      });
    }

    applicant.fullName = fullName;
    applicant.email = email || req.user.email;
    applicant.phone = phone;
    applicant.phone2 = phone2;
    applicant.email2 = email2;
    applicant.contactAddress = contactAddress;
    applicant.age = age;
    applicant.schoolOccupation = schoolOccupation;
    applicant.homeTown = homeTown;
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
    applicant.guarantorPassportPhotoDataUrl = guarantorPassportPhotoDataUrl;
    applicant.birthCertificateDataUrl = birthCertificateDataUrl;
    applicant.schoolCertificateDataUrl = schoolCertificateDataUrl;
    applicant.attestationLetterDataUrl = attestationLetterDataUrl;
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
    applicant.serviceStatus = serviceStatus || applicant.serviceStatus || req.user.serviceStatus;
    applicant.serviceNumber = serviceNumber || applicant.serviceNumber;
    applicant.department = department || applicant.department;
    applicant.parentName = parentName;
    applicant.parentContactAddress = parentContactAddress;
    applicant.parentOccupation = parentOccupation;
    applicant.parentPhone1 = parentPhone1;
    applicant.parentPhone2 = parentPhone2;
    applicant.parentEmail = parentEmail;
    applicant.parentSignature = parentSignature;
    applicant.status = isLegacyUpdate ? "under_review" : "under_review";
    applicant.submitted = true;
    applicant.submittedAt = new Date();

    await applicant.save();

    // Keep legacy access active so the officer can revisit the update form until admin review is complete.
    if (isLegacyUpdate) {
      try {
        await User.findByIdAndUpdate(req.user.id, { legacyApproved: true, registrationStatus: "under_review" });
      } catch (err) {
        console.error('Failed to keep legacy access active:', err);
      }
    }

    await sendPushToRole(
      "admin",
      {
        title: "New Application Submitted",
        body: `${applicant.fullName || "An applicant"} submitted an application.`,
        url: "/",
        tag: "application-submitted",
      },
      { registrationStatus: "approved" }
    );

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
router.get("/announcements", authMiddleware, restrictPendingLegacy, async (req, res) => {
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

// Public announcements (for landing page / public site)
router.get("/public/announcements", async (req, res) => {
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

export default router;
