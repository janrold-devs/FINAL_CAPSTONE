import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action:   { type: String, required: true }, // e.g. "Added Stock", "Recorded Spoilage", "Completed Transaction"
  details:  { type: String }, // optional: extra info (e.g. "Added 20 pcs Cups to storage")
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("ActivityLog", activityLogSchema);
