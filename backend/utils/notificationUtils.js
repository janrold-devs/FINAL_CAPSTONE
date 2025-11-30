import Notification from "../models/Notification.js";
import Ingredient from "../models/Ingredient.js";
import User from "../models/User.js";

// Check and create notifications for ALL users (admin and staff)
export const checkIngredientNotifications = async (ingredient) => {
  try {
    console.log(`🔔 Checking notifications for ingredient: ${ingredient.name}`);
    
    const today = new Date();
    const expiringSoonThreshold = 3;
    const threshold = Number(ingredient.alertLevel) || Number(ingredient.alert) || 10;
    
    console.log(`📊 Ingredient details - Quantity: ${ingredient.quantity}, Alert Level: ${threshold}, Expiration: ${ingredient.expiration}`);
    
    // Get ALL admin and staff users who should receive notifications
    const users = await User.find({
      status: 'active',
      $or: [{ role: 'admin' }, { role: 'staff' }]
    }).select('_id role');
    
    console.log(`👥 Found ${users.length} users to notify:`, users.map(u => u.role));
    
    let totalCreatedNotifications = [];

    for (const user of users) {
      const currentUserId = user._id;
      let createdNotifications = [];

      console.log(`🔍 Checking notifications for ${user.role} user: ${currentUserId}`);

      // Clear existing notifications for this ingredient that might be resolved
      const existingNotifications = await Notification.find({
        user: currentUserId,
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
          console.log(`🗑️ Cleared ${existingNotif.type} notification for ${ingredient.name} for user ${currentUserId}`);
        }
      }

      // Create new notifications if conditions are met
      if (Number(ingredient.quantity) <= 0) {
        console.log(`🚨 Creating OUT OF STOCK notification for ${ingredient.name} for user ${currentUserId}`);
        const notification = await Notification.create({
          user: currentUserId,
          type: "out_of_stock",
          priority: "critical",
          title: "Out of Stock!",
          message: `${ingredient.name} is completely out of stock!`,
          ingredientId: ingredient._id
        });
        createdNotifications.push(notification);
        console.log(`✅ Created out_of_stock notification: ${notification._id}`);
      } else if (Number(ingredient.quantity) <= threshold) {
        console.log(`⚠️ Creating LOW STOCK notification for ${ingredient.name} (${ingredient.quantity} <= ${threshold}) for user ${currentUserId}`);
        const priority = Number(ingredient.quantity) <= 5 ? "high" : "medium";
        const notification = await Notification.create({
          user: currentUserId,
          type: "low_stock",
          priority: priority,
          title: "Low Stock Alert",
          message: `${ingredient.name} is running low (${ingredient.quantity} ${ingredient.unit || 'units'} left). Alert level: ${threshold}`,
          ingredientId: ingredient._id
        });
        createdNotifications.push(notification);
        console.log(`✅ Created low_stock notification: ${notification._id}`);
      }

      // Expiration notifications
      if (ingredient.expiration) {
        const expirationDate = new Date(ingredient.expiration);
        const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        console.log(`📅 Expiration check: ${ingredient.name} expires in ${daysLeft} days for user ${currentUserId}`);
        
        if (daysLeft <= expiringSoonThreshold && daysLeft >= 0) {
          const priority = daysLeft <= 1 ? "critical" : daysLeft <= 3 ? "high" : "medium";
          console.log(`⏰ Creating EXPIRING notification for ${ingredient.name} (${daysLeft} days left) for user ${currentUserId}`);
          const notification = await Notification.create({
            user: currentUserId,
            type: "expiring",
            priority: priority,
            title: "Expiring Soon",
            message: `${ingredient.name} expires in ${daysLeft} day(s) on ${expirationDate.toLocaleDateString()}`,
            ingredientId: ingredient._id
          });
          createdNotifications.push(notification);
          console.log(`✅ Created expiring notification: ${notification._id}`);
        } else if (daysLeft < 0) {
          console.log(`❌ Creating EXPIRED notification for ${ingredient.name} (expired ${Math.abs(daysLeft)} days ago) for user ${currentUserId}`);
          const notification = await Notification.create({
            user: currentUserId,
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

      totalCreatedNotifications = [...totalCreatedNotifications, ...createdNotifications];
    }

    console.log(`🎉 Total notifications created for ${ingredient.name}: ${totalCreatedNotifications.length} across ${users.length} users`);
    return totalCreatedNotifications;
  } catch (error) {
    console.error("❌ Error checking ingredient notifications:", error);
    return [];
  }
};