// backend/utils/socketUtils.js
import { generateNotifications } from "./notificationUtils.js";

export const emitNotificationsToAll = async (io) => {
  try {
    if (!io) {
      console.warn("Socket.IO not available");
      return;
    }
    
    const notifications = await generateNotifications();
    io.emit("notifications_update", notifications);
    console.log("Real-time notifications emitted to all clients");
  } catch (error) {
    console.error("Error emitting notifications:", error);
  }
};