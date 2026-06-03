import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["applicant", "admin"],
      default: "applicant",
    },
    applicantId: {
      type: String,
      unique: true,
      sparse: true,
    },
    adminId: {
      type: String,
      unique: true,
      sparse: true,
    },
    serviceStatus: {
      type: String,
      enum: ["active", "dismissed", "retired"],
      default: "active",
    },
    registrationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    legacyApproved: {
      type: Boolean,
      default: false,
    },
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        expirationTime: { type: Date, default: null },
        keys: {
          p256dh: { type: String, default: "" },
          auth: { type: String, default: "" },
        },
        userAgent: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
      },
    ],
    fcmTokens: [
      {
        token: { type: String, required: true },
        userAgent: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: {   
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcryptjs.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
