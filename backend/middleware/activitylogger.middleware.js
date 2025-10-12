// backend/middleware/activitylogger.middleware.js
import ActivityLog from "../models/ActivityLog.js";

// Usage: await logActivity(req, "ADD_STOCK", "Added 20 pcs Cups to storage");
export const logActivity = async (req, action, details = "") => {
  try {
    if (!req.user) {
      console.warn("No user info available for activity log");
      return;
    }

    await ActivityLog.create({
      user: req.user.id, // comes from decoded JWT
      action,
      details,
    });
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};
