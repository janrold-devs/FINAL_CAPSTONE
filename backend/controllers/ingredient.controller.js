import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { checkIngredientNotifications } from "../utils/notificationUtils.js";

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

    // Check and create notifications
    await checkIngredientNotifications(updatedIngredient);

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
    const ingredientId = req.params.id;
    
    // Find the ingredient first
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found." });
    }

    // Import models to check for historical records
    const Spoilage = (await import("../models/Spoilage.js")).default;
    const StockIn = (await import("../models/StockIn.js")).default;

    // Check if ingredient is referenced in historical records
    const spoilageCount = await Spoilage.countDocuments({
      "ingredients.ingredient": ingredientId
    });
    
    const stockInCount = await StockIn.countDocuments({
      "ingredients.ingredient": ingredientId
    });

    // If there are historical records, implement soft delete
    if (spoilageCount > 0 || stockInCount > 0) {
      // Add a 'deleted' flag to the ingredient instead of hard delete
      ingredient.deleted = true;
      ingredient.deletedAt = new Date();
      await ingredient.save();

      // Log activity
      await logActivity(req, "SOFT_DELETE_INGREDIENT", 
        `Soft deleted ingredient: ${ingredient.name} (${spoilageCount} spoilage records, ${stockInCount} stock-in records preserved)`);

      return res.json({ 
        message: `Ingredient "${ingredient.name}" has been deactivated. Historical records (${spoilageCount} spoilage, ${stockInCount} stock-in) have been preserved.`,
        type: "soft_delete",
        preservedRecords: {
          spoilage: spoilageCount,
          stockIn: stockInCount
        }
      });
    }

    // If no historical records, safe to hard delete
    await Ingredient.findByIdAndDelete(ingredientId);
    
    // Log activity
    await logActivity(req, "DELETE_INGREDIENT", `Deleted ingredient: ${ingredient.name}`);

    res.json({ 
      message: `Ingredient "${ingredient.name}" deleted successfully.`,
      type: "hard_delete"
    });
  } catch (err) {
    console.error("Error deleting ingredient:", err);
    res.status(500).json({ message: err.message });
  }
};