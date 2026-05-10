import express from "express";
import Applicant from "../models/Applicant.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
