import mongoose from "mongoose";

const legacyClaimSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicantId: {
      type: String,
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    dob: {
      type: String,
      default: "",
      trim: true,
    },
    legacyServiceNumber: {
      type: String,
      default: "",
      trim: true,
    },
    lastUnit: {
      type: String,
      default: "",
      trim: true,
    },
    approvalYear: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "deleted"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

legacyClaimSchema.index({ status: 1, createdAt: -1 });
legacyClaimSchema.index({ email: 1, legacyServiceNumber: 1 });

export default mongoose.model("LegacyClaim", legacyClaimSchema);