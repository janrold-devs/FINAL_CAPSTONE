import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { checkIngredientNotifications } from "../utils/notificationUtils.js";

export const createIngredient = async (req, res) => {
  try {
    console.log("🔍 Creating ingredient - User:", req.user?._id);
    
    // Trim and auto-capitalize the name
    const trimmedName = req.body.name.trim().toUpperCase();
    
    // Check if ACTIVE ingredient with trimmed name already exists
    const existingActive = await Ingredient.findOne({ 
      name: { $regex: `^${trimmedName}$`, $options: 'i' },
      deleted: { $ne: true }
    });
    
    if (existingActive) {
      return res.status(400).json({ 
        message: `Active ingredient "${trimmedName}" already exists.` 
      });
    }

    // Check if DELETED ingredient with same name exists (for archive suggestion)
    const existingDeleted = await Ingredient.findOne({ 
      name: { $regex: `^${trimmedName}$`, $options: 'i' },
      deleted: true
    });
    
    if (existingDeleted) {
      return res.status(409).json({ 
        message: `An archived ingredient "${trimmedName}" exists. You can restore it instead of creating a new one.`,
        code: "ARCHIVED_EXISTS",
        archivedIngredient: {
          _id: existingDeleted._id,
          name: existingDeleted.name,
          category: existingDeleted.category,
          unit: existingDeleted.unit,
          deletedAt: existingDeleted.deletedAt
        }
      });
    }
    
    // Create with auto-capitalized name
    const body = { 
      ...req.body, 
      name: trimmedName, // AUTO-CAPS applied
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
    // Trim and auto-capitalize name if provided in update
    if (req.body.name) {
      req.body.name = req.body.name.trim().toUpperCase(); // AUTO-CAPS applied
      
      // Check for duplicates among ACTIVE ingredients (excluding current ingredient)
      const trimmedName = req.body.name;
      const existing = await Ingredient.findOne({ 
        name: { $regex: `^${trimmedName}$`, $options: 'i' },
        _id: { $ne: req.params.id },
        deleted: { $ne: true }
      });
      
      if (existing) {
        return res.status(400).json({ 
          message: `Active ingredient "${trimmedName}" already exists.` 
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
    
    // Import IngredientBatch model to get batch information
    const IngredientBatch = (await import("../models/IngredientBatch.js")).default;
    
    // Enhance each ingredient with batch information
    const enhancedList = await Promise.all(
      list.map(async (ingredient) => {
        // Get the earliest expiring active batch for this ingredient
        const earliestBatch = await IngredientBatch.findOne({
          ingredient: ingredient._id,
          status: 'active',
          currentQuantity: { $gt: 0 }
        }).sort({ expirationDate: 1 });
        
        // Get total number of active batches
        const activeBatchCount = await IngredientBatch.countDocuments({
          ingredient: ingredient._id,
          status: 'active',
          currentQuantity: { $gt: 0 }
        });
        
        return {
          ...ingredient.toObject(),
          // Add batch information
          nextExpiration: earliestBatch?.expirationDate || null,
          activeBatches: activeBatchCount,
          earliestBatchNumber: earliestBatch?.batchNumber || null
        };
      })
    );
    
    res.json(enhancedList);
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
        message: `Ingredient "${ingredient.name}" has been archived. Historical records (${spoilageCount} spoilage, ${stockInCount} stock-in) have been preserved.`,
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

// ===== ARCHIVE MANAGEMENT ENDPOINTS =====

// Get all archived ingredients
export const getArchivedIngredients = async (req, res) => {
  try {
    const archivedList = await Ingredient.find({ deleted: true })
      .sort({ deletedAt: -1 });

    // Get historical record counts for each archived ingredient
    const Spoilage = (await import("../models/Spoilage.js")).default;
    const StockIn = (await import("../models/StockIn.js")).default;

    const enrichedList = await Promise.all(
      archivedList.map(async (ingredient) => {
        const spoilageCount = await Spoilage.countDocuments({
          "ingredients.ingredient": ingredient._id
        });
        
        const stockInCount = await StockIn.countDocuments({
          "ingredients.ingredient": ingredient._id
        });

        return {
          ...ingredient.toObject(),
          historicalRecords: {
            spoilage: spoilageCount,
            stockIn: stockInCount,
            total: spoilageCount + stockInCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: enrichedList,
      count: enrichedList.length
    });
  } catch (err) {
    console.error("Error fetching archived ingredients:", err);
    res.status(500).json({ message: err.message });
  }
};

// Restore archived ingredient
export const restoreIngredient = async (req, res) => {
  try {
    const ingredientId = req.params.id;
    
    // Find the archived ingredient
    const ingredient = await Ingredient.findOne({ 
      _id: ingredientId, 
      deleted: true 
    });
    
    if (!ingredient) {
      return res.status(404).json({ 
        message: "Archived ingredient not found." 
      });
    }

    // Check if an active ingredient with the same name already exists
    const existingActive = await Ingredient.findOne({
      name: { $regex: `^${ingredient.name}$`, $options: 'i' },
      deleted: { $ne: true },
      _id: { $ne: ingredientId }
    });

    if (existingActive) {
      return res.status(400).json({
        message: `Cannot restore "${ingredient.name}" because an active ingredient with the same name already exists.`,
        code: "NAME_CONFLICT",
        existingIngredient: {
          _id: existingActive._id,
          name: existingActive.name,
          category: existingActive.category
        }
      });
    }

    // Restore the ingredient
    ingredient.deleted = false;
    ingredient.deletedAt = undefined;
    await ingredient.save();

    // Log activity
    await logActivity(req, "RESTORE_INGREDIENT", `Restored ingredient: ${ingredient.name}`);

    res.json({
      success: true,
      message: `Ingredient "${ingredient.name}" has been restored successfully.`,
      data: ingredient
    });
  } catch (err) {
    console.error("Error restoring ingredient:", err);
    res.status(500).json({ message: err.message });
  }
};

// Permanently delete archived ingredient
export const permanentlyDeleteIngredient = async (req, res) => {
  try {
    const ingredientId = req.params.id;
    
    // Find the archived ingredient
    const ingredient = await Ingredient.findOne({ 
      _id: ingredientId, 
      deleted: true 
    });
    
    if (!ingredient) {
      return res.status(404).json({ 
        message: "Archived ingredient not found." 
      });
    }

    // Check for historical records
    const Spoilage = (await import("../models/Spoilage.js")).default;
    const StockIn = (await import("../models/StockIn.js")).default;

    const spoilageCount = await Spoilage.countDocuments({
      "ingredients.ingredient": ingredientId
    });
    
    const stockInCount = await StockIn.countDocuments({
      "ingredients.ingredient": ingredientId
    });

    if (spoilageCount > 0 || stockInCount > 0) {
      return res.status(400).json({
        message: `Cannot permanently delete "${ingredient.name}" because it has historical records (${spoilageCount} spoilage, ${stockInCount} stock-in). Historical data would be lost.`,
        code: "HAS_HISTORICAL_RECORDS",
        historicalRecords: {
          spoilage: spoilageCount,
          stockIn: stockInCount,
          total: spoilageCount + stockInCount
        }
      });
    }

    // Safe to permanently delete
    await Ingredient.findByIdAndDelete(ingredientId);

    // Log activity
    await logActivity(req, "PERMANENT_DELETE_INGREDIENT", `Permanently deleted ingredient: ${ingredient.name}`);

    res.json({
      success: true,
      message: `Ingredient "${ingredient.name}" has been permanently deleted.`
    });
  } catch (err) {
    console.error("Error permanently deleting ingredient:", err);
    res.status(500).json({ message: err.message });
  }
};