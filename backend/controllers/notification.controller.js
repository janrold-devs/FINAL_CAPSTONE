import Notification from "../models/Notification.js";
import Ingredient from "../models/Ingredient.js";
import IngredientBatch from "../models/IngredientBatch.js";
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
      deleted: { $ne: true }
    });

    // Get all admin and staff users
    const users = await User.find({
      status: 'approved', // Fixed: Users have 'approved' status, not 'active'
      $or: [{ role: 'admin' }, { role: 'staff' }]
    });

    console.log(`🔍 Generating notifications for ${ingredients.length} ingredients and ${users.length} users`);

    const notifications = [];

    for (const user of users) {
      for (const ing of ingredients) {
        // Fix: Use 'alert' field instead of 'alertLevel'
        const threshold = Number(ing.alert) || 10;

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
              title: "Low Stock",
              message: `${ing.name} remaining stocks (${ing.quantity} ${ing.unit || 'units'} left).`,
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
              title: "Out of Stock",
              message: `${ing.name} is completely out of stock!`,
              ingredientId: ing._id
            });
            notifications.push(notification);
          }
        }

        // NEW: Batch-based expiration check
        const activeBatches = await IngredientBatch.find({
          ingredient: ing._id,
          status: 'active',
          currentQuantity: { $gt: 0 },
          expirationDate: { $exists: true }
        }).sort({ expirationDate: 1 }); // Sort by expiration date (earliest first)

        for (const batch of activeBatches) {
          const expirationDate = new Date(batch.expirationDate);
          const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

          // Check if notification already exists for this specific batch
          const existingBatchNotification = await Notification.findOne({
            user: user._id,
            ingredientId: ing._id,
            type: { $in: ['expiring', 'expired'] },
            isCleared: false,
            message: { $regex: batch.batchNumber } // Check if batch number is in message
          });

          // Expiring soon (1-3 days)
          if (daysLeft <= expiringSoonThreshold && daysLeft >= 0) {
            const priority = daysLeft <= 1 ? "critical" : daysLeft <= 2 ? "high" : "medium";
            if (!existingBatchNotification || !existingBatchNotification.message.includes('expires in')) {
              const notification = await Notification.create({
                user: user._id,
                type: "expiring",
                priority: priority,
                title: "Batch Expiring Soon",
                message: `${ing.name} (Batch: ${batch.batchNumber}) expires in ${daysLeft} day(s) on ${expirationDate.toLocaleDateString()}. Quantity: ${batch.currentQuantity} ${batch.unit}`,
                ingredientId: ing._id
              });
              notifications.push(notification);
            }
          }

          // Already expired
          if (daysLeft < 0) {
            if (!existingBatchNotification || !existingBatchNotification.message.includes('expired')) {
              const notification = await Notification.create({
                user: user._id,
                type: "expired",
                priority: "critical",
                title: "Batch Expired!",
                message: `${ing.name} (Batch: ${batch.batchNumber}) expired ${Math.abs(daysLeft)} day(s) ago! Quantity: ${batch.currentQuantity} ${batch.unit}`,
                ingredientId: ing._id
              });
              notifications.push(notification);

              // Auto-update batch status to expired
              batch.status = 'expired';
              await batch.save();
            }
          }
        }
      }
    }

    console.log(`✅ Generated ${notifications.length} new notifications`);
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

// NEW: Get expiring batches summary (useful for debugging)
export const getExpiringBatches = async (req, res) => {
  try {
    const today = new Date();
    const expiringSoonThreshold = 3; // days

    const expiringBatches = await IngredientBatch.find({
      status: 'active',
      currentQuantity: { $gt: 0 },
      expirationDate: {
        $exists: true,
        $gte: today,
        $lte: new Date(today.getTime() + expiringSoonThreshold * 24 * 60 * 60 * 1000)
      }
    })
      .populate('ingredient', 'name unit')
      .sort({ expirationDate: 1 });

    const expiredBatches = await IngredientBatch.find({
      status: 'active',
      currentQuantity: { $gt: 0 },
      expirationDate: {
        $exists: true,
        $lt: today
      }
    })
      .populate('ingredient', 'name unit')
      .sort({ expirationDate: 1 });

    res.json({
      expiringSoon: expiringBatches.map(batch => ({
        batchNumber: batch.batchNumber,
        ingredient: batch.ingredient.name,
        quantity: batch.currentQuantity,
        unit: batch.unit,
        expirationDate: batch.expirationDate,
        daysLeft: Math.ceil((batch.expirationDate - today) / (1000 * 60 * 60 * 24))
      })),
      expired: expiredBatches.map(batch => ({
        batchNumber: batch.batchNumber,
        ingredient: batch.ingredient.name,
        quantity: batch.currentQuantity,
        unit: batch.unit,
        expirationDate: batch.expirationDate,
        daysOverdue: Math.abs(Math.ceil((batch.expirationDate - today) / (1000 * 60 * 60 * 24)))
      }))
    });
  } catch (err) {
    console.error("Error fetching expiring batches:", err);
    res.status(500).json({ message: err.message });
  }
};