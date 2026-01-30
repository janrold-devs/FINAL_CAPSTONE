// backend/routes/notification.route.js
import express from "express";
import { 
  getNotifications,
  clearNotification,
  clearAllNotifications,
  triggerNotificationGeneration,
  getNotificationStats,
  getExpiringBatches
} from "../controllers/notification.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all notifications for user
router.get("/", auth, getNotifications);

// Get notification statistics
router.get("/stats", auth, getNotificationStats);

// Get expiring batches summary
router.get("/expiring-batches", auth, getExpiringBatches);

// Clear single notification
router.delete("/:id", auth, clearNotification);

// Clear all notifications
router.delete("/", auth, clearAllNotifications);

// Manually trigger notification generation
router.post("/generate", auth, triggerNotificationGeneration);

export default router;