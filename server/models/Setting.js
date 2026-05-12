import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    recruitmentOpen: { type: Boolean, default: true },
    emailNotifications: {
      enabled: { type: Boolean, default: false },
      address: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
