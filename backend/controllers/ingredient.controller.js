import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { emitNotificationsToUser } from "../utils/socketUtils.js";
import { checkIngredientNotifications } from "../utils/notificationUtils.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const createIngredient = async (req, res) => {
  try {
    console.log("🔍 Creating ingredient - User:", req.user?._id);
    
    const body = { ...req.body, user: req.user._id };
    const created = await Ingredient.create(body);

    console.log("✅ Ingredient created:", created.name, "User:", created.user);

    // Log activity
    await logActivity(req, "ADD_INGREDIENT", `Added new ingredient: ${created.name}`);

    // Check and create notifications for ALL users (admin and staff)
    await checkIngredientNotifications(created);

    // Emit real-time notifications to ALL users
    const io = req.app.get("io");
    const users = await User.find({
      status: 'active',
      $or: [{ role: 'admin' }, { role: 'staff' }]
    });
    
    console.log(`📢 Emitting notifications to ${users.length} users`);
    for (const user of users) {
      await emitNotificationsToUser(io, user._id);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("Error in createIngredient:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const updatedIngredient = await Ingredient.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );

    // ✅ IMMEDIATELY check and create notifications
    const newNotifications = await checkIngredientNotifications(updatedIngredient);

    // ✅ IMMEDIATELY emit to all connected users
    const io = req.app.get('io');
    if (io) {
      // **FIXED: Use correct status field and include isActive**
      const users = await User.find({
        status: 'approved', // Changed from 'active' to 'approved'
        isActive: true,     // Added isActive check
        $or: [{ role: 'admin' }, { role: 'staff' }]
      });

      console.log(`📢 Emitting notifications to ${users.length} users`);
      
      for (const user of users) {
        const userNotifications = await Notification.find({
          user: user._id,
          isCleared: false
        })
        .populate("ingredientId", "name unit quantity expiration alertLevel")
        .sort({ createdAt: -1 });
        
        const userIdString = user._id.toString();
        io.to(userIdString).emit("notifications_update", userNotifications);
        console.log(`📡 Emitted ${userNotifications.length} notifications to user ${userIdString}`);
      }
    }

    res.json(updatedIngredient);
  } catch (error) {
    console.error("Error updating ingredient:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getIngredients = async (req, res) => {
  try {
    const list = await Ingredient.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getIngredient = async (req, res) => {
  try {
    const item = await Ingredient.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Ingredient not found." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteIngredient = async (req, res) => {
  try {
    const deleted = await Ingredient.findByIdAndDelete(req.params.id);
    if (deleted) {
      // Log activity
      await logActivity(req, "DELETE_INGREDIENT", `Deleted ingredient: ${deleted.name}`);
      
      // Emit real-time notifications to ALL users
      const io = req.app.get("io");
      const users = await User.find({
        status: 'active',
        $or: [{ role: 'admin' }, { role: 'staff' }]
      });
      
      console.log(`📢 Emitting notifications to ${users.length} users after deletion`);
      for (const user of users) {
        await emitNotificationsToUser(io, user._id);
      }
    }
    res.json({ message: "Ingredient deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};