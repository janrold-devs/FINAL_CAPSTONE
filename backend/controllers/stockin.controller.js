// backend/controllers/stockin.controller.js
import StockIn from "../models/StockIn.js";
import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// --- Case-insensitive Unit Conversion Helper (Same as spoilage controller) ---
const unitConversion = {
  // Volume - support both uppercase and lowercase
  ml: { ml: 1, l: 1000, mL: 1, L: 1000, liter: 1000, litre: 1000, milliliters: 1 },
  l: { ml: 0.001, l: 1, mL: 0.001, L: 1, liter: 1, litre: 1, milliliters: 0.001 },
  // Weight
  g: { g: 1, kg: 1000, gram: 1, grams: 1 },
  kg: { g: 0.001, kg: 1, gram: 0.001, grams: 0.001 },
  // Count
  pcs: { pcs: 1, pc: 1, piece: 1, pieces: 1 },
  // Uppercase variations
  mL: { ml: 1, l: 1000, mL: 1, L: 1000 },
  L: { ml: 0.001, l: 1, mL: 0.001, L: 1 },
};

/**
 * Convert value from one unit to another (case-insensitive)
 * @param {number} value - The quantity to convert
 * @param {string} fromUnit - Original unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted value
 */
function convertToBaseUnit(value, fromUnit, toUnit) {
  // Normalize units to lowercase for comparison but preserve original for lookup
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  
  // If units are the same (case-insensitive), return original value
  if (from === to) return value;
  
  // Create normalized unit keys that exist in our map
  const normalizedFrom = fromUnit; // Keep original for lookup
  const normalizedTo = toUnit; // Keep original for lookup
  
  // Check if conversion is available (try multiple variations)
  if (unitConversion[normalizedTo] && unitConversion[normalizedTo][normalizedFrom]) {
    return value * unitConversion[normalizedTo][normalizedFrom];
  }
  
  // Try lowercase versions
  if (unitConversion[to] && unitConversion[to][from]) {
    return value * unitConversion[to][from];
  }
  
  // Try uppercase versions
  const fromUpper = fromUnit.toUpperCase();
  const toUpper = toUnit.toUpperCase();
  if (unitConversion[toUpper] && unitConversion[toUpper][fromUpper]) {
    return value * unitConversion[toUpper][fromUpper];
  }
  
  // If we still can't convert, throw an error
  throw new Error(`Unit conversion not supported: ${fromUnit} → ${toUnit}`);
}

// CREATE StockIn with unit conversion + ingredient update
export const createStockIn = async (req, res) => {
  try {
    const { stockman, ingredients } = req.body; // REMOVED batchNumber

    // Validate required fields (REMOVED batchNumber from validation)
    if (!stockman) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "Stockman is required."
      });
    }
    
    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "At least one ingredient is required."
      });
    }

    // Validate each ingredient
    for (const item of ingredients) {
      if (!item.ingredient) {
        return res.status(400).json({
          code: "MISSING_INGREDIENT_ID",
          message: "Ingredient ID is required for all items."
        });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          code: "INVALID_QUANTITY",
          message: "Quantity must be greater than 0."
        });
      }
      if (!item.unit) {
        return res.status(400).json({
          code: "MISSING_UNIT",
          message: "Unit is required for all ingredients."
        });
      }
    }

    // Prepare ingredients with snapshot data
    const processedIngredients = [];
    
    for (const item of ingredients) {
      const ingredient = await Ingredient.findById(item.ingredient);
      if (!ingredient) {
        return res.status(404).json({
          code: "INGREDIENT_NOT_FOUND",
          message: `Ingredient with ID ${item.ingredient} not found.`
        });
      }
      
      processedIngredients.push({
        ingredient: item.ingredient,
        ingredientSnapshot: {
          _id: ingredient._id,
          name: ingredient.name,
          category: ingredient.category,
          unit: ingredient.unit
        },
        quantity: item.quantity,
        unit: item.unit
      });
    }

    // Save stock-in document with snapshot data (DO NOT send batchNumber, let the model generate it)
    const doc = await StockIn.create({ stockman, ingredients: processedIngredients });

    // Update ingredient quantities with unit conversion
    for (const item of ingredients) {
      const ingredient = await Ingredient.findById(item.ingredient);
      if (!ingredient) {
        console.warn(`Ingredient ${item.ingredient} not found, skipping`);
        continue;
      }

      let qtyToAdd = item.quantity;

      // Convert if input unit doesn't match base unit (case-insensitive comparison)
      if (item.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
        try {
          qtyToAdd = convertToBaseUnit(
            item.quantity,
            item.unit,        // Use original unit from request
            ingredient.unit    // Use unit from ingredient
          );
        } catch (convError) {
          console.error("Unit conversion error:", convError);
          return res.status(400).json({
            code: "UNIT_CONVERSION_ERROR",
            message: `Cannot convert ${item.quantity} ${item.unit} to ${ingredient.unit} for ${ingredient.name}.`
          });
        }
      }

      // Update ingredient stock
      ingredient.quantity += qtyToAdd;
      await ingredient.save();
    }

    // Log activity
    await logActivity(
      req,
      "CREATE_STOCKIN",
      `Stock In: Batch ${doc.batchNumber} by ${stockman}`,
      doc._id
    );

    res.status(201).json({
      success: true,
      message: "Stock-in record created successfully",
      data: doc
    });
  } catch (err) {
    console.error("Error creating stockin:", err);
    
    // Handle duplicate batch number
    if (err.code === 11000) {
      return res.status(400).json({
        code: "DUPLICATE_BATCH",
        message: "Batch number already exists"
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: err.message
      });
    }
    
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Failed to create stock-in record"
    });
  }
};

// GET all StockIns
export const getStockIns = async (req, res) => {
  try {
    const list = await StockIn.find()
      .populate("stockman")
      .populate({
        path: "ingredients.ingredient",
        // Include deleted ingredients for historical records
        match: null,
        options: { strictPopulate: false }
      })
      .sort({ date: -1 });

    // Process the results to use snapshot data when ingredient is deleted
    const processedList = list.map(stockIn => {
      const stockInObj = stockIn.toObject();
      stockInObj.ingredients = stockInObj.ingredients.map(item => {
        // If ingredient is deleted or not found, use snapshot data
        if (!item.ingredient || item.ingredient.deleted) {
          return {
            ...item,
            ingredient: item.ingredientSnapshot || {
              _id: item.ingredientSnapshot?._id || item.ingredient?._id,
              name: item.ingredientSnapshot?.name || "[Deleted Ingredient]",
              category: item.ingredientSnapshot?.category || "Unknown",
              unit: item.ingredientSnapshot?.unit || item.unit,
              deleted: true
            }
          };
        }
        return item;
      });
      return stockInObj;
    });

    res.json({
      success: true,
      data: processedList
    });
  } catch (err) {
    console.error("Error fetching stockins:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Failed to fetch stock-in records"
    });
  }
};

// GET single StockIn
export const getStockIn = async (req, res) => {
  try {
    const item = await StockIn.findById(req.params.id)
      .populate("stockman")
      .populate({
        path: "ingredients.ingredient",
        // Include deleted ingredients for historical records
        match: null,
        options: { strictPopulate: false }
      });

    if (!item) return res.status(404).json({
      code: "NOT_FOUND",
      message: "StockIn not found"
    });

    // Process the result to use snapshot data when ingredient is deleted
    const itemObj = item.toObject();
    itemObj.ingredients = itemObj.ingredients.map(ingredientItem => {
      // If ingredient is deleted or not found, use snapshot data
      if (!ingredientItem.ingredient || ingredientItem.ingredient.deleted) {
        return {
          ...ingredientItem,
          ingredient: ingredientItem.ingredientSnapshot || {
            _id: ingredientItem.ingredientSnapshot?._id || ingredientItem.ingredient?._id,
            name: ingredientItem.ingredientSnapshot?.name || "[Deleted Ingredient]",
            category: ingredientItem.ingredientSnapshot?.category || "Unknown",
            unit: ingredientItem.ingredientSnapshot?.unit || ingredientItem.unit,
            deleted: true
          }
        };
      }
      return ingredientItem;
    });

    res.json({
      success: true,
      data: itemObj
    });
  } catch (err) {
    console.error("Error fetching stockin:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Failed to fetch stock-in record"
    });
  }
};

// DELETE StockIn
export const deleteStockIn = async (req, res) => {
  try {
    const deleted = await StockIn.findById(req.params.id);
    if (!deleted) return res.status(404).json({
      code: "NOT_FOUND",
      message: "StockIn not found"
    });

    // Reverse the stock addition before deleting
    for (const item of deleted.ingredients) {
      const ingredient = await Ingredient.findById(item.ingredient);
      if (!ingredient) continue;

      let qtyToDeduct = item.quantity;

      // Convert if unit doesn't match
      if (item.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
        try {
          qtyToDeduct = convertToBaseUnit(
            item.quantity,
            item.unit,
            ingredient.unit
          );
        } catch (convError) {
          console.warn("Unit conversion error during delete:", convError);
          // Continue with deletion even if conversion fails
          continue;
        }
      }

      // Deduct the quantity
      ingredient.quantity = Math.max(0, ingredient.quantity - qtyToDeduct);
      await ingredient.save();
    }

    // Delete the stock-in record
    await StockIn.findByIdAndDelete(req.params.id);

    // Log activity
    await logActivity(
      req,
      "DELETE_STOCKIN",
      `Deleted Stock In: Batch ${deleted.batchNumber}`,
      deleted._id
    );

    res.json({
      success: true,
      message: "Stock-in record removed and stock adjusted"
    });
  } catch (err) {
    console.error("Error deleting stockin:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Failed to delete stock-in record"
    });
  }
};