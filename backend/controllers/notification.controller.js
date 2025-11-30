import Notification from "../models/Notification.js";
import Ingredient from "../models/Ingredient.js";
import User from "../models/User.js";

// Get notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const notifications = await Notification.find({
      user: userId,
      isCleared: false
    })
    .populate("ingredientId", "name unit quantity expiration alertLevel")
    .sort({ createdAt: -1 })
    .limit(100);

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: err.message });
  }
};

// Clear notification (soft delete)
export const clearNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isCleared: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification cleared successfully" });
  } catch (err) {
    console.error("Error clearing notification:", err);
    res.status(500).json({ message: err.message });
  }
};

// Clear all notifications for user
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { user: userId, isCleared: false },
      { isCleared: true }
    );

    res.json({ message: "All notifications cleared successfully" });
  } catch (err) {
    console.error("Error clearing all notifications:", err);
    res.status(500).json({ message: err.message });
  }
};

// Generate and save notifications based on ingredient conditions FOR ALL USERS
export const generateAndSaveNotifications = async () => {
  try {
    const today = new Date();
    const expiringSoonThreshold = 3; // days

    // Get all ingredients (not filtered by user)
    const ingredients = await Ingredient.find({ 
      status: { $ne: "inactive" }
    });
    
    // Get all admin and staff users
    const users = await User.find({
      status: 'active',
      $or: [{ role: 'admin' }, { role: 'staff' }]
    });
    
    console.log(`🔍 Generating notifications for ${ingredients.length} ingredients and ${users.length} users`);
    
    const notifications = [];

    for (const user of users) {
      for (const ing of ingredients) {
        const threshold = Number(ing.alertLevel) || Number(ing.alert) || 10;

        // Check if notification already exists for this condition
        const existingNotification = await Notification.findOne({
          user: user._id,
          ingredientId: ing._id,
          type: { $in: ['low_stock', 'out_of_stock', 'expiring', 'expired'] },
          isCleared: false
        });

        // Low stock check
        if (Number(ing.quantity) <= threshold && Number(ing.quantity) > 0) {
          if (!existingNotification || existingNotification.type !== 'low_stock') {
            const notification = await Notification.create({
              user: user._id,
              type: "low_stock",
              priority: Number(ing.quantity) <= 5 ? "high" : "medium",
              title: "Low Stock Alert",
              message: `${ing.name} is running low (${ing.quantity} ${ing.unit || 'units'} left). Alert level: ${threshold}`,
              ingredientId: ing._id
            });
            notifications.push(notification);
          }
        }

        // Out of stock check 
        if (Number(ing.quantity) <= 0) {
          if (!existingNotification || existingNotification.type !== 'out_of_stock') {
            const notification = await Notification.create({
              user: user._id,
              type: "out_of_stock", 
              priority: "critical",
              title: "Out of Stock!",
              message: `${ing.name} is completely out of stock!`,
              ingredientId: ing._id
            });
            notifications.push(notification);
          }
        }

        // Expiration check
        if (ing.expiration) {
          const expirationDate = new Date(ing.expiration);
          const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysLeft <= expiringSoonThreshold && daysLeft >= 0) {
            const priority = daysLeft <= 1 ? "critical" : daysLeft <= 3 ? "high" : "medium";
            if (!existingNotification || existingNotification.type !== 'expiring') {
              const notification = await Notification.create({
                user: user._id,
                type: "expiring",
                priority: priority,
                title: "Expiring Soon",
                message: `${ing.name} expires in ${daysLeft} day(s) on ${expirationDate.toLocaleDateString()}`,
                ingredientId: ing._id
              });
              notifications.push(notification);
            }
          }
          
          // Already expired
          if (daysLeft < 0) {
            if (!existingNotification || existingNotification.type !== 'expired') {
              const notification = await Notification.create({
                user: user._id,
                type: "expired",
                priority: "critical",
                title: "Expired Ingredient!",
                message: `${ing.name} expired ${Math.abs(daysLeft)} day(s) ago!`,
                ingredientId: ing._id
              });
              notifications.push(notification);
            }
          }
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error generating and saving notifications:", error);
    return [];
  }
};

// Manually trigger notification generation
export const triggerNotificationGeneration = async (req, res) => {
  try {
    const newNotifications = await generateAndSaveNotifications();
    
    // Emit real-time update to ALL users
    const io = req.app.get("io");
    if (io) {
      const users = await User.find({
        status: 'active',
        $or: [{ role: 'admin' }, { role: 'staff' }]
      });
      
      for (const user of users) {
        const userNotifications = await Notification.find({
          user: user._id,
          isCleared: false
        })
        .populate("ingredientId", "name unit quantity expiration alertLevel")
        .sort({ createdAt: -1 });
        
        io.to(user._id.toString()).emit("notifications_update", userNotifications);
      }
    }

    res.json({ 
      message: "Notifications generated successfully", 
      generated: newNotifications.length,
      notifications: newNotifications 
    });
  } catch (err) {
    console.error("Error triggering notification generation:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const stats = await Notification.aggregate([
      { 
        $match: { 
          user: userId,
          isCleared: false 
        } 
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Notification.countDocuments({
      user: userId,
      isCleared: false
    });

    res.json({
      total,
      byPriority: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error("Error fetching notification stats:", err);
    res.status(500).json({ message: err.message });
  }
};