import Ingredient from "../models/Ingredient.js";

export const getNotifications = async (req, res) => {
  try {
    const today = new Date();
    const expiringSoonThreshold = 3; // in days

    const ingredients = await Ingredient.find();

    const notifications = [];

    for (const ing of ingredients) {
      // Use per-ingredient alert threshold if available, else default to 10
      const threshold = Number(ing.alert) || 10;

      // Low stock check
      if (Number(ing.quantity) <= threshold) {
        notifications.push({
          title: "Low Stock Alert",
          message: `${ing.name} is running low (${ing.quantity} left).`,
          date: new Date(),
        });
      }

      // Expiration check (use the expiration field from Ingredient)
      if (ing.expiration) {
        const daysLeft = Math.ceil(
          (new Date(ing.expiration) - today) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= expiringSoonThreshold && daysLeft >= 0) {
          notifications.push({
            title: "Expiring Soon",
            message: `${ing.name} expires in ${daysLeft} day(s).`,
            date: new Date(),
          });
        }
      }
    }

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};