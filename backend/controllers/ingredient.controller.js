import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { emitNotificationsToUser } from "../utils/socketUtils.js";
import { checkIngredientNotifications } from "../utils/notificationUtils.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const createIngredient = async (req, res) => {
  try {
    console.log("🔍 Creating ingredient - User:", req.user?._id);
    
    // Trim the name to prevent whitespace duplicates
    const trimmedName = req.body.name.trim();
    
    // Check if ingredient with trimmed name already exists
    const existing = await Ingredient.findOne({ 
      name: { $regex: `^${trimmedName}$`, $options: 'i' } 
    });
    
    if (existing) {
      return res.status(400).json({ 
        message: `Ingredient "${trimmedName}" already exists.` 
      });
    }
    
    // Create with trimmed name
    const body = { 
      ...req.body, 
      name: trimmedName,
      user: req.user._id 
    };
    
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
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "Ingredient with this name already exists. Please use a different name." 
      });
    }
    
    res.status(500).json({ message: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    // Trim name if provided in update
    if (req.body.name) {
      req.body.name = req.body.name.trim();
      
      // Check for duplicates (excluding current ingredient)
      const trimmedName = req.body.name;
      const existing = await Ingredient.findOne({ 
        name: { $regex: `^${trimmedName}$`, $options: 'i' },
        _id: { $ne: req.params.id }
      });
      
      if (existing) {
        return res.status(400).json({ 
          message: `Ingredient "${trimmedName}" already exists.` 
        });
      }
    }

    const updatedIngredient = await Ingredient.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedIngredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    // ✅ IMMEDIATELY check and create notifications
    const newNotifications = await checkIngredientNotifications(updatedIngredient);

    // ✅ IMMEDIATELY emit to all connected users
    const io = req.app.get('io');
    if (io) {
      const users = await User.find({
        status: 'approved',
        isActive: true,
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
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Ingredient with this name already exists. Please use a different name." 
      });
    }
    
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