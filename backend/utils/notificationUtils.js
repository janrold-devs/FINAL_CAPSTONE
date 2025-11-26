import Notification from "../models/Notification.js";
import Ingredient from "../models/Ingredient.js";

export const generateNotifications = async (userId) => {
  try {
    console.log(`🔍 Generating notifications for user: ${userId}`);
    
    // Get all active notifications for the user
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

    console.log(`📋 Found ${notifications.length} active notifications for user ${userId}`);
    return notifications;
  } catch (error) {
    console.error("❌ Error generating notifications:", error);
    return [];
  }
};

// Check and create notifications for ingredient updates
export const checkIngredientNotifications = async (ingredient, userId) => {
  try {
    console.log(`🔔 Checking notifications for ingredient: ${ingredient.name}, User: ${userId}`);
    
    const today = new Date();
    const expiringSoonThreshold = 3;
    const threshold = Number(ingredient.alertLevel) || Number(ingredient.alert) || 10;
    
    console.log(`📊 Ingredient details - Quantity: ${ingredient.quantity}, Alert Level: ${threshold}, Expiration: ${ingredient.expiration}`);
    
    let createdNotifications = [];

    // Clear existing notifications for this ingredient that might be resolved
    const existingNotifications = await Notification.find({
      user: userId,
      ingredientId: ingredient._id,
      isCleared: false,
      type: { $in: ['low_stock', 'out_of_stock', 'expiring', 'expired'] }
    });

    // Only clear notifications if the condition no longer exists
    for (const existingNotif of existingNotifications) {
      let shouldClear = false;
      
      switch (existingNotif.type) {
        case 'low_stock':
          if (Number(ingredient.quantity) > threshold || Number(ingredient.quantity) <= 0) {
            shouldClear = true;
          }
          break;
        case 'out_of_stock':
          if (Number(ingredient.quantity) > 0) {
            shouldClear = true;
          }
          break;
        case 'expiring':
        case 'expired':
          if (ingredient.expiration) {
            const expirationDate = new Date(ingredient.expiration);
            const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
            if (daysLeft > expiringSoonThreshold && daysLeft >= 0) {
              shouldClear = true;
            }
          } else {
            shouldClear = true;
          }
          break;
      }

      if (shouldClear) {
        await Notification.findByIdAndUpdate(existingNotif._id, { isCleared: true });
        console.log(`🗑️ Cleared ${existingNotif.type} notification for ${ingredient.name}`);
      }
    }

    // Create new notifications if conditions are met
    if (Number(ingredient.quantity) <= 0) {
      console.log(`🚨 Creating OUT OF STOCK notification for ${ingredient.name}`);
      const notification = await Notification.create({
        user: userId,
        type: "out_of_stock",
        priority: "critical",
        title: "Out of Stock!",
        message: `${ingredient.name} is completely out of stock!`,
        ingredientId: ingredient._id
      });
      createdNotifications.push(notification);
      console.log(`✅ Created out_of_stock notification: ${notification._id}`);
    } else if (Number(ingredient.quantity) <= threshold) {
      console.log(`⚠️ Creating LOW STOCK notification for ${ingredient.name} (${ingredient.quantity} <= ${threshold})`);
      const priority = Number(ingredient.quantity) <= 5 ? "high" : "medium";
      const notification = await Notification.create({
        user: userId,
        type: "low_stock",
        priority: priority,
        title: "Low Stock Alert",
        message: `${ingredient.name} is running low (${ingredient.quantity} ${ingredient.unit || 'units'} left). Alert level: ${threshold}`,
        ingredientId: ingredient._id
      });
      createdNotifications.push(notification);
      console.log(`✅ Created low_stock notification: ${notification._id}`);
    } else {
      console.log(`✅ ${ingredient.name} quantity (${ingredient.quantity}) is above alert level (${threshold}) - no notification needed`);
    }

    // Expiration notifications
    if (ingredient.expiration) {
      const expirationDate = new Date(ingredient.expiration);
      const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 Expiration check: ${ingredient.name} expires in ${daysLeft} days`);
      
      if (daysLeft <= expiringSoonThreshold && daysLeft >= 0) {
        const priority = daysLeft <= 1 ? "critical" : daysLeft <= 3 ? "high" : "medium";
        console.log(`⏰ Creating EXPIRING notification for ${ingredient.name} (${daysLeft} days left)`);
        const notification = await Notification.create({
          user: userId,
          type: "expiring",
          priority: priority,
          title: "Expiring Soon",
          message: `${ingredient.name} expires in ${daysLeft} day(s) on ${expirationDate.toLocaleDateString()}`,
          ingredientId: ingredient._id
        });
        createdNotifications.push(notification);
        console.log(`✅ Created expiring notification: ${notification._id}`);
      } else if (daysLeft < 0) {
        console.log(`❌ Creating EXPIRED notification for ${ingredient.name} (expired ${Math.abs(daysLeft)} days ago)`);
        const notification = await Notification.create({
          user: userId,
          type: "expired",
          priority: "critical",
          title: "Expired Ingredient!",
          message: `${ingredient.name} expired ${Math.abs(daysLeft)} day(s) ago!`,
          ingredientId: ingredient._id
        });
        createdNotifications.push(notification);
        console.log(`✅ Created expired notification: ${notification._id}`);
      }
    }

    console.log(`🎉 Total notifications created for ${ingredient.name}: ${createdNotifications.length}`);
    return createdNotifications;
  } catch (error) {
    console.error("❌ Error checking ingredient notifications:", error);
    return [];
  }
};