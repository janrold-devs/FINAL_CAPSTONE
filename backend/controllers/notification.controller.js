// backend/controllers/notification.controller.js
import { generateNotifications } from "../utils/notificationUtils.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await generateNotifications();
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: err.message });
  }
};

// Add this endpoint to manually trigger notifications (for testing)
export const triggerNotifications = async (req, res) => {
  try {
    const io = req.app.get("io");
    const notifications = await generateNotifications();
    
    if (io) {
      io.emit("notifications_update", notifications);
    }
    
    res.json({ message: "Notifications triggered successfully", notifications });
  } catch (err) {
    console.error("Error triggering notifications:", err);
    res.status(500).json({ message: err.message });
  }
};