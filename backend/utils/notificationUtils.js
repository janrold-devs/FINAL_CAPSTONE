// backend/utils/notificationUtils.js
import Ingredient from "../models/Ingredient.js";

export const generateNotifications = async () => {
  try {
    const today = new Date();
    const expiringSoonThreshold = 3; // days

    const ingredients = await Ingredient.find({ status: { $ne: "inactive" } });
    const notifications = [];

    for (const ing of ingredients) {
      const threshold = Number(ing.alertLevel) || Number(ing.alert) || 10;

      // Low stock check
      if (Number(ing.quantity) <= threshold && Number(ing.quantity) > 0) {
        notifications.push({
          _id: `${ing._id}_low_stock`,
          type: "low_stock",
          priority: Number(ing.quantity) <= 5 ? "high" : "medium",
          title: "Low Stock Alert",
          message: `${ing.name} is running low (${ing.quantity} ${ing.unit || 'units'} left). Alert level: ${threshold}`,
          date: new Date(),
          ingredientId: ing._id
        });
      }

      // Out of stock check 
      if (Number(ing.quantity) <= 0) {
        notifications.push({
          _id: `${ing._id}_out_of_stock`,
          type: "out_of_stock", 
          priority: "critical",
          title: "Out of Stock!",
          message: `${ing.name} is completely out of stock!`,
          date: new Date(),
          ingredientId: ing._id
        });
      }

      // Expiration check
      if (ing.expiration) {
        const expirationDate = new Date(ing.expiration);
        const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= expiringSoonThreshold && daysLeft >= 0) {
          const priority = daysLeft <= 1 ? "critical" : daysLeft <= 3 ? "high" : "medium";
          notifications.push({
            _id: `${ing._id}_expiring`,
            type: "expiring",
            priority: priority,
            title: "Expiring Soon",
            message: `${ing.name} expires in ${daysLeft} day(s) on ${expirationDate.toLocaleDateString()}`,
            date: new Date(),
            ingredientId: ing._id
          });
        }
        
        // Already expired
        if (daysLeft < 0) {
          notifications.push({
            _id: `${ing._id}_expired`,
            type: "expired",
            priority: "critical",
            title: "Expired Ingredient!",
            message: `${ing.name} expired ${Math.abs(daysLeft)} day(s) ago!`,
            date: new Date(),
            ingredientId: ing._id
          });
        }
      }
    }

    // Sort by priority (critical -> high -> medium)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.date) - new Date(a.date);
    });

    return notifications;
  } catch (error) {
    console.error("Error generating notifications:", error);
    return [];
  }
};