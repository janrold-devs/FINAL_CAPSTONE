// backend/controllers/spoilage.controller.js
import Spoilage from "../models/Spoilage.js";
import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// --- Case-insensitive Unit Conversion Helper ---
const unitConversion = {
  // Volume
  ml: { ml: 1, l: 1000, cl: 100, liter: 1000, litre: 1000, milliliters: 1 },
  l: { ml: 0.001, l: 1, cl: 0.01, liter: 1, litre: 1, milliliters: 0.001 },
  cl: { ml: 10, l: 100, cl: 1, liter: 100, litre: 100 },
  
  // Weight
  g: { g: 1, kg: 1000, gram: 1, grams: 1, kilogram: 1000, kilograms: 1000 },
  kg: { g: 0.001, kg: 1, gram: 0.001, grams: 0.001, kilogram: 1, kilograms: 1 },
  
  // Count
  pcs: { pcs: 1, pc: 1, piece: 1, pieces: 1, unit: 1, units: 1 },
  
  // Liquid-specific
  liter: { ml: 1000, l: 1, liter: 1, litre: 1 },
  litre: { ml: 1000, l: 1, liter: 1, litre: 1 },
};

/**
 * Convert value from one unit to another (case-insensitive)
 * @param {number} value - The quantity to convert
 * @param {string} fromUnit - Original unit (e.g., "L", "ML", "l", "ml")
 * @param {string} toUnit - Target unit (e.g., "ml", "L")
 * @returns {number} Converted value
 */
function convertToBaseUnit(value, fromUnit, toUnit) {
  // Normalize units to lowercase for comparison
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();
  
  // If units are the same (case-insensitive), return original value
  if (from === to) return value;
  
  // Check if conversion is available
  if (unitConversion[to] && unitConversion[to][from]) {
    return value * unitConversion[to][from];
  }
  
  // Try reverse conversion
  if (unitConversion[from] && unitConversion[from][to]) {
    return value / unitConversion[from][to];
  }
  
  // Try to find common aliases
  const aliases = {
    // Volume
    ml: ['milliliter', 'milliliters', 'milli liter'],
    l: ['liter', 'liters', 'litre', 'litres'],
    cl: ['centiliter', 'centiliters'],
    
    // Weight
    g: ['gram', 'grams'],
    kg: ['kilogram', 'kilograms', 'kilo'],
    
    // Count
    pcs: ['piece', 'pieces', 'pc', 'unit', 'units', 'count'],
  };
  
  // Find standard unit for aliases
  let standardFrom = from;
  let standardTo = to;
  
  for (const [std, aliasList] of Object.entries(aliases)) {
    if (aliasList.includes(from)) standardFrom = std;
    if (aliasList.includes(to)) standardTo = std;
  }
  
  // Try conversion with standardized units
  if (unitConversion[standardTo] && unitConversion[standardTo][standardFrom]) {
    return value * unitConversion[standardTo][standardFrom];
  }
  
  // If we still can't convert, throw an error
  throw new Error(`Unit conversion not supported: ${fromUnit} (${from}) → ${toUnit} (${to})`);
}

// --- CREATE Spoilage with FIFO batch tracking ---
export const createSpoilage = async (req, res) => {
  try {
    const { personInCharge, ingredients, remarks } = req.body;

    // Validation
    if (!personInCharge) {
      return res.status(400).json({ 
        code: "NO_PERSON_IN_CHARGE",
        message: "Person in charge is required." 
      });
    }

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ 
        code: "NO_INGREDIENTS",
        message: "At least one ingredient is required." 
      });
    }

    // Import batch service
    const { deductQuantityFIFO, capitalizeText } = await import("../services/batchService.js");

    let totalWaste = 0;
    const processedIngredients = [];

    // Process each ingredient using FIFO batch system
    for (const item of ingredients) {
      // Validate ingredient data
      if (!item.ingredient) {
        return res.status(400).json({ 
          code: "INVALID_INGREDIENT",
          message: "Ingredient ID is required for all items." 
        });
      }

      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ 
          code: "INVALID_QUANTITY",
          message: `Quantity must be greater than 0 for ingredient ${item.ingredient}` 
        });
      }

      if (!item.unit) {
        return res.status(400).json({ 
          code: "MISSING_UNIT",
          message: `Unit is required for ingredient ${item.ingredient}` 
        });
      }

      // Find the ingredient
      const ing = await Ingredient.findById(item.ingredient);
      if (!ing) {
        return res.status(404).json({ 
          code: "INGREDIENT_NOT_FOUND",
          message: `Ingredient with ID ${item.ingredient} not found.` 
        });
      }

      try {
        // Use FIFO batch system to deduct quantity
        const deductionResult = await deductQuantityFIFO(
          item.ingredient,
          item.quantity,
          item.unit,
          item.spoilageReason || "other"
        );

        // Process each batch deduction for spoilage record
        for (const deduction of deductionResult.deductionDetails) {
          processedIngredients.push({
            ingredient: item.ingredient,
            ingredientSnapshot: {
              _id: ing._id,
              name: capitalizeText(ing.name), // AUTO-CAPS
              category: ing.category,
              unit: (ing.unit || "").toLowerCase()
            },
            quantity: deduction.quantityDeducted,
            unit: (deductionResult.unit || "").toLowerCase(),
            batchNumber: deduction.batchNumber,
            expirationDate: deduction.expirationDate,
            spoilageReason: item.spoilageReason || "other",
            sourceBatch: deduction.batchId
          });
        }

        // Add to total waste
        totalWaste += deductionResult.totalDeducted;

      } catch (batchError) {
        console.error("FIFO batch deduction error:", batchError);
        
        // If no active batches available, handle as non-batch ingredient
        if (batchError.message.includes("No active batches available")) {
          console.log(`⚠️ No batches for ${ing.name}, treating as non-batch ingredient`);
          
          // Convert quantity to ingredient's base unit for consistency
          let convertedQuantity = item.quantity;
          if (item.unit.toLowerCase() !== ing.unit.toLowerCase()) {
            try {
              convertedQuantity = convertToBaseUnit(item.quantity, item.unit, ing.unit);
            } catch (convError) {
              console.warn(`Unit conversion failed for ${ing.name}:`, convError);
              // Use original quantity if conversion fails
              convertedQuantity = item.quantity;
            }
          }
          
          // Check if ingredient has enough stock (for non-batch ingredients)
          if (ing.quantity < convertedQuantity) {
            return res.status(400).json({ 
              code: "INSUFFICIENT_STOCK",
              message: `Insufficient stock for ${ing.name}. Available: ${ing.quantity} ${ing.unit}, Requested: ${convertedQuantity} ${ing.unit}`
            });
          }
          
          // Deduct from ingredient total quantity
          ing.quantity = Math.max(0, ing.quantity - convertedQuantity);
          await ing.save();
          
          // Add to spoilage record without batch information
          processedIngredients.push({
            ingredient: item.ingredient,
            ingredientSnapshot: {
              _id: ing._id,
              name: capitalizeText(ing.name), // AUTO-CAPS
              category: ing.category,
              unit: (ing.unit || "").toLowerCase()
            },
            quantity: convertedQuantity,
            unit: (ing.unit || "").toLowerCase(),
            batchNumber: null, // No batch for non-batch ingredients
            expirationDate: null,
            spoilageReason: item.spoilageReason || "other",
            sourceBatch: null
          });
          
          // Add to total waste
          totalWaste += convertedQuantity;
          
        } else {
          // Other batch errors (insufficient stock, etc.)
          return res.status(400).json({ 
            code: "BATCH_DEDUCTION_ERROR",
            message: batchError.message
          });
        }
      }
    }

    // Create spoilage record with batch information
    const spoilageDoc = await Spoilage.create({
      personInCharge,
      spoilageType: "manual",
      ingredients: processedIngredients,
      totalWaste,
      remarks: capitalizeText(remarks || ""), // AUTO-CAPS for remarks
    });

    // Populate the created document for response
    const populatedDoc = await Spoilage.findById(spoilageDoc._id)
      .populate("personInCharge")
      .populate("ingredients.ingredient")
      .populate("ingredients.sourceBatch");

    // Log activity
    await logActivity(
      req,
      "CREATE_SPOILAGE",
      `Recorded spoilage: ${processedIngredients.length} batch items, total waste: ${totalWaste}`,
      spoilageDoc._id
    );

    res.status(201).json({
      success: true,
      message: "Spoilage recorded successfully with batch tracking",
      data: populatedDoc,
      batchInfo: {
        totalBatchesAffected: processedIngredients.length,
        batchNumbers: [...new Set(processedIngredients.map(item => item.batchNumber))]
      }
    });

  } catch (err) {
    console.error("Error creating spoilage:", err);
    
    // Handle specific errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        code: "VALIDATION_ERROR",
        message: err.message 
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        code: "DUPLICATE_ERROR",
        message: "Duplicate spoilage record detected" 
      });
    }
    
    res.status(500).json({ 
      code: "SERVER_ERROR",
      message: "Failed to create spoilage record",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// --- GET all Spoilages ---
export const getSpoilages = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      personInCharge,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build filter
    const filter = {};
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Person in charge filter
    if (personInCharge) {
      filter.personInCharge = personInCharge;
    }
    
    // Category filter (via ingredient category)
    if (category) {
      filter['ingredients.ingredient.category'] = category;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const total = await Spoilage.countDocuments(filter);
    
    // Fetch with pagination and sorting
    const list = await Spoilage.find(filter)
      .populate("personInCharge")
      .populate({
        path: "ingredients.ingredient",
        // Include deleted ingredients for historical records
        match: null,
        options: { strictPopulate: false }
      })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Process the results to use snapshot data when ingredient is deleted
    const processedList = list.map(spoilage => {
      const spoilageObj = spoilage.toObject();
      spoilageObj.ingredients = spoilageObj.ingredients.map(item => {
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
      return spoilageObj;
    });

    res.json({
      success: true,
      data: processedList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    console.error("Error fetching spoilages:", err);
    res.status(500).json({ 
      code: "SERVER_ERROR",
      message: "Failed to fetch spoilage records" 
    });
  }
};

// --- GET single Spoilage ---
export const getSpoilage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ 
        code: "INVALID_ID",
        message: "Spoilage ID is required" 
      });
    }

    const doc = await Spoilage.findById(id)
      .populate("personInCharge")
      .populate({
        path: "ingredients.ingredient",
        // Include deleted ingredients for historical records
        match: null,
        options: { strictPopulate: false }
      });

    if (!doc) {
      return res.status(404).json({ 
        code: "NOT_FOUND",
        message: "Spoilage record not found" 
      });
    }

    // Process the result to use snapshot data when ingredient is deleted
    const docObj = doc.toObject();
    docObj.ingredients = docObj.ingredients.map(item => {
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

    res.json({
      success: true,
      data: docObj
    });

  } catch (err) {
    console.error("Error fetching spoilage:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        code: "INVALID_ID_FORMAT",
        message: "Invalid spoilage ID format" 
      });
    }
    
    res.status(500).json({ 
      code: "SERVER_ERROR",
      message: "Failed to fetch spoilage record" 
    });
  }
};

// --- DELETE Spoilage ---
export const deleteSpoilage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ 
        code: "INVALID_ID",
        message: "Spoilage ID is required" 
      });
    }

    const deleted = await Spoilage.findById(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        code: "NOT_FOUND",
        message: "Spoilage record not found" 
      });
    }

    // Restore stock for all affected ingredients
    for (const item of deleted.ingredients) {
      const ing = await Ingredient.findById(item.ingredient);
      if (!ing) continue;

      try {
        const convertedQty = convertToBaseUnit(
          item.quantity,
          item.unit,
          ing.unit
        );
        ing.quantity += convertedQty;
        await ing.save();
      } catch (convError) {
        console.warn(`Could not restore stock for ingredient ${item.ingredient}:`, convError);
        // Continue with other ingredients even if one fails
      }
    }

    // Delete the spoilage record
    await Spoilage.findByIdAndDelete(id);

    // Log activity
    await logActivity(
      req,
      "DELETE_SPOILAGE",
      `Deleted spoilage record and restored stock for ${deleted.ingredients.length} items`,
      deleted._id
    );

    res.json({
      success: true,
      message: "Spoilage record deleted and stock restored successfully"
    });

  } catch (err) {
    console.error("Error deleting spoilage:", err);
    res.status(500).json({ 
      code: "SERVER_ERROR",
      message: "Failed to delete spoilage record" 
    });
  }
};