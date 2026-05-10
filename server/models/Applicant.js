import mongoose from "mongoose";

const applicantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicantId: {
      type: String,
      unique: true,
      required: true,
    },
    fullName: String,
    email: String,
    phone: String,
    gender: String,
    dob: String,
    state: String,
    lga: String,
    address: String,
    qualification: String,
    kinName: String,
    kinPhone: String,
    medInfo: String,
    whyJoin: String,
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    serviceStatus: {
      type: String,
      enum: ["active", "dismissed", "retired"],
      default: "active",
    },
    submitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Applicant", applicantSchema);
