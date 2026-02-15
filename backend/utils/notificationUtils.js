import Notification from "../models/Notification.js";
import Ingredient from "../models/Ingredient.js";
import User from "../models/User.js";

export const checkIngredientNotifications = async (ingredient) => {
  try {
    console.log(`🔔 Checking notifications for ingredient: ${ingredient.name}, Quantity: ${ingredient.quantity}`);

    const today = new Date();
    const expiringSoonThreshold = 3;
    const threshold = Number(ingredient.alertLevel) || Number(ingredient.alert) || 10;

    console.log(`📊 Alert threshold: ${threshold}, Current quantity: ${ingredient.quantity}`);

    // **FIXED: Use correct status field and include isActive**
    const users = await User.find({
      status: 'approved', // Changed from 'active' to 'approved'
      isActive: true,     // Added isActive check
      $or: [{ role: 'admin' }, { role: 'staff' }]
    }).select('_id role firstName lastName');

    console.log(`👥 Found ${users.length} users to notify:`, users.map(u => ({
      id: u._id,
      role: u.role,
      name: `${u.firstName} ${u.lastName}`
    })));

    // If no users found, log more details for debugging
    if (users.length === 0) {
      console.log('❌ No approved admin/staff users found. Checking all users...');
      const allUsers = await User.find().select('_id role status isActive firstName lastName');
      console.log('📋 All users in system:', allUsers);
      return []; // Return early if no users
    }

    let totalCreatedNotifications = [];

    for (const user of users) {
      const currentUserId = user._id;
      let createdNotifications = [];

      console.log(`🔍 Processing notifications for ${user.role} user: ${user.firstName} ${user.lastName} (${currentUserId})`);

      // Get existing notifications for this ingredient and user
      const existingNotifications = await Notification.find({
        user: currentUserId,
        ingredientId: ingredient._id,
        isCleared: false
      });

      console.log(`📋 Found ${existingNotifications.length} existing notifications`);

      // Determine what notifications SHOULD exist based on current state
      const currentQuantity = Number(ingredient.quantity);
      const shouldHaveOutOfStock = currentQuantity <= 0;
      const shouldHaveLowStock = currentQuantity > 0 && currentQuantity <= threshold;

      let shouldHaveExpiring = false;
      let shouldHaveExpired = false;

      if (ingredient.expiration) {
        const expirationDate = new Date(ingredient.expiration);
        const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        shouldHaveExpiring = daysLeft <= expiringSoonThreshold && daysLeft >= 0;
        shouldHaveExpired = daysLeft < 0;
      }

      console.log(`📊 Condition check - OutOfStock: ${shouldHaveOutOfStock}, LowStock: ${shouldHaveLowStock}, Expiring: ${shouldHaveExpiring}, Expired: ${shouldHaveExpired}`);

      // Clear notifications that shouldn't exist anymore
      for (const existingNotif of existingNotifications) {
        let shouldClear = false;

        switch (existingNotif.type) {
          case 'out_of_stock':
            shouldClear = !shouldHaveOutOfStock;
            break;
          case 'low_stock':
            shouldClear = !shouldHaveLowStock;
            break;
          case 'expiring':
            shouldClear = !shouldHaveExpiring;
            break;
          case 'expired':
            shouldClear = !shouldHaveExpired;
            break;
        }

        if (shouldClear) {
          await Notification.findByIdAndUpdate(existingNotif._id, { isCleared: true });
          console.log(`🗑️ Cleared ${existingNotif.type} notification for ${ingredient.name}`);
        }
      }

      // Create new notifications if conditions are met AND no active notification exists
      if (shouldHaveOutOfStock) {
        const exists = existingNotifications.some(n => n.type === 'out_of_stock' && !n.isCleared);
        if (!exists) {
          console.log(`🚨 Creating OUT OF STOCK notification for ${ingredient.name}`);
          const notification = await Notification.create({
            user: currentUserId,
            type: "out_of_stock",
            priority: "critical",
            title: "Out of Stock!",
            message: `${ingredient.name} out of stock!`,
            ingredientId: ingredient._id
          });
          createdNotifications.push(notification);
          console.log(`✅ Created notification ID: ${notification._id}`);
        }
      } else if (shouldHaveLowStock) {
        const exists = existingNotifications.some(n => n.type === 'low_stock' && !n.isCleared);
        if (!exists) {
          console.log(`⚠️ Creating LOW STOCK notification for ${ingredient.name} (${currentQuantity} <= ${threshold})`);
          const priority = currentQuantity <= 5 ? "high" : "medium";
          const notification = await Notification.create({
            user: currentUserId,
            type: "low_stock",
            priority: priority,
            title: "Remaining Stocks",
            message: `${ingredient.name} remaining stocks (${currentQuantity} ${ingredient.unit || 'units'} left).`,
            ingredientId: ingredient._id
          });
          createdNotifications.push(notification);
          console.log(`✅ Created notification ID: ${notification._id}`);
        }
      }

      // Expiration notifications
      if (shouldHaveExpiring) {
        const exists = existingNotifications.some(n => n.type === 'expiring' && !n.isCleared);
        if (!exists) {
          const expirationDate = new Date(ingredient.expiration);
          const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
          const priority = daysLeft <= 1 ? "critical" : daysLeft <= 3 ? "high" : "medium";

          console.log(`⏰ Creating EXPIRING notification for ${ingredient.name} (${daysLeft} days left)`);
          const notification = await Notification.create({
            user: currentUserId,
            type: "expiring",
            priority: priority,
            title: "Expiring Soon",
            message: `${ingredient.name} expires in ${daysLeft} day(s) on ${expirationDate.toLocaleDateString()}`,
            ingredientId: ingredient._id
          });
          createdNotifications.push(notification);
          console.log(`✅ Created notification ID: ${notification._id}`);
        }
      }

      if (shouldHaveExpired) {
        const exists = existingNotifications.some(n => n.type === 'expired' && !n.isCleared);
        if (!exists) {
          const expirationDate = new Date(ingredient.expiration);
          const daysLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

          console.log(`❌ Creating EXPIRED notification for ${ingredient.name} (expired ${Math.abs(daysLeft)} days ago)`);
          const notification = await Notification.create({
            user: currentUserId,
            type: "expired",
            priority: "critical",
            title: "Expired Ingredient!",
            message: `${ingredient.name} expired ${Math.abs(daysLeft)} day(s) ago!`,
            ingredientId: ingredient._id
          });
          createdNotifications.push(notification);
          console.log(`✅ Created notification ID: ${notification._id}`);
        }
      }

      totalCreatedNotifications = [...totalCreatedNotifications, ...createdNotifications];
    }

    console.log(`🎉 Total notifications created for ${ingredient.name}: ${totalCreatedNotifications.length}`);
    return totalCreatedNotifications;
  } catch (error) {
    console.error("❌ Error checking ingredient notifications:", error);
    return [];
  }
};