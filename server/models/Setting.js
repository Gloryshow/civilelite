import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    recruitmentOpen: { type: Boolean, default: true },
    emailNotifications: {
      enabled: { type: Boolean, default: false },
      address: { type: String, default: "" },
    },
    manualPayment: {
      enabled: { type: Boolean, default: true },
      feeAmount: { type: Number, default: 5000 },
      currency: { type: String, default: "NGN" },
      bankName: { type: String, default: "Zenith" },
      accountName: { type: String, default: "Civic Rights and peace building foundation" },
      accountNumber: { type: String, default: "1311106690" },
      bankBranch: { type: String, default: "" },
      receiptRequirement: {
        type: String,
        default: "Come to camp with your payment receipt for verification.",
      },
      note: {
        type: String,
        default: "Paystack and Flutterwave are not enabled yet.",
      },
    },
    // Service number configuration
    serviceYear: { type: Number, default: new Date().getFullYear() },
    serviceBatch: { type: Number, default: 1 },
    servicePrefix: { type: String, default: "CES" },
    batchPadding: { type: Number, default: 2 },
    positionPadding: { type: Number, default: 3 },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
