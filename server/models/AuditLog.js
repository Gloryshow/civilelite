import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    action: String,
    details: String,
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
