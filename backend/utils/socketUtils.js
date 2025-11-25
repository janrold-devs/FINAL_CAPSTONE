// backend/utils/socketUtils.js
import Notification from "../models/Notification.js"; // Add this import

export const emitNotificationsToUser = async (io, userId) => {
  try {
    if (!io) {
      console.warn("Socket.IO not available");
      return;
    }
    
    if (!userId) {
      console.warn("User ID is required for emitting notifications");
      return;
    }
    
    console.log(`📡 Emitting notifications to user: ${userId}`);
    
    // Get notifications directly instead of calling generateNotifications
    const notifications = await Notification.find({
      user: userId,
      isCleared: false
    })
    .populate("ingredientId", "name unit quantity expiration alertLevel")
    .sort({ 
      priority: 1, // critical first
      createdAt: -1 
    })
    .limit(100);
    
    // Convert user ID to string for socket room
    const userIdString = userId.toString ? userId.toString() : String(userId);
    io.to(userIdString).emit("notifications_update", notifications);
    
    console.log(`✅ Real-time notifications emitted to user ${userIdString}. Sent ${notifications.length} notifications`);
  } catch (error) {
    console.error("❌ Error emitting notifications:", error);
  }
};