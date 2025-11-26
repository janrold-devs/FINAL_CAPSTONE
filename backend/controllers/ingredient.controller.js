// backend/controllers/ingredient.controller.js
import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { emitNotificationsToUser } from "../utils/socketUtils.js";
import { checkIngredientNotifications } from "../utils/notificationUtils.js";

export const createIngredient = async (req, res) => {
  try {
    console.log("🔍 Creating ingredient - User:", req.user?._id);
    
    const body = { ...req.body, user: req.user._id }; // Use req.user._id
    const created = await Ingredient.create(body);

    console.log("✅ Ingredient created:", created.name, "User:", created.user);

    // Log activity
    await logActivity(req, "ADD_INGREDIENT", `Added new ingredient: ${created.name}`);

    // Check and create notifications for this ingredient
    await checkIngredientNotifications(created, req.user._id);

    // Emit real-time notifications
    const io = req.app.get("io");
    await emitNotificationsToUser(io, req.user._id);

    res.status(201).json(created);
  } catch (err) {
    console.error("Error in createIngredient:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    console.log("🔍 Updating ingredient - User:", req.user?._id);
    
    const updated = await Ingredient.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true }
    );
    
    if (!updated) return res.status(404).json({ message: "Ingredient not found." });

    console.log("✅ Ingredient updated:", updated.name, "Existing User:", updated.user);

    // Log activity
    await logActivity(req, "UPDATE_INGREDIENT", `Updated ingredient: ${updated.name}`);

    // Use the ingredient's existing user, or fall back to current user
    const ingredientUserId = updated.user || req.user._id;
    
    if (!ingredientUserId) {
      console.error("❌ No user ID available for ingredient notifications");
      return res.json(updated);
    }

    console.log("🔔 Checking notifications with user ID:", ingredientUserId);
    
    // Check and create notifications for this ingredient
    await checkIngredientNotifications(updated, ingredientUserId);

    // Emit real-time notifications
    const io = req.app.get("io");
    await emitNotificationsToUser(io, ingredientUserId);

    res.json(updated);
  } catch (err) {
    console.error("Error in updateIngredient:", err);
    res.status(500).json({ message: err.message });
  }
};

// Keep other functions the same but add user checks...
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
      
      // Use the ingredient's existing user
      const ingredientUserId = deleted.user;
      
      // Emit real-time notifications
      const io = req.app.get("io");
      if (ingredientUserId) {
        await emitNotificationsToUser(io, ingredientUserId);
      }
    }
    res.json({ message: "Ingredient deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};