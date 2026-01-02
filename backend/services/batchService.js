import IngredientBatch from "../models/IngredientBatch.js";
import Ingredient from "../models/Ingredient.js";
import Spoilage from "../models/Spoilage.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

/**
 * FIFO Batch Management Service
 * Handles First In First Out inventory management and automatic expiration
 */

// Unit conversion helper (same as controllers)
const unitConversion = {
  ml: { ml: 1, l: 1000, mL: 1, L: 1000, liter: 1000, litre: 1000, milliliters: 1 },
  l: { ml: 0.001, l: 1, mL: 0.001, L: 1, liter: 1, litre: 1, milliliters: 0.001 },
  g: { g: 1, kg: 1000, gram: 1, grams: 1 },
  kg: { g: 0.001, kg: 1, gram: 0.001, grams: 0.001 },
  pcs: { pcs: 1, pc: 1, piece: 1, pieces: 1 },
  mL: { ml: 1, l: 1000, mL: 1, L: 1000 },
  L: { ml: 0.001, l: 1, mL: 0.001, L: 1 },
};

function convertToBaseUnit(value, fromUnit, toUnit) {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  
  if (from === to) return value;
  
  if (unitConversion[to] && unitConversion[to][from]) {
    return value * unitConversion[to][from];
  }
  
  if (unitConversion[from] && unitConversion[from][to]) {
    return value / unitConversion[from][to];
  }
  
  throw new Error(`Unit conversion not supported: ${fromUnit} → ${toUnit}`);
}

/**
 * Create ingredient batches from stock-in data
 */
export const createBatchesFromStockIn = async (stockInData, stockInId) => {
  const createdBatches = [];
  
  for (const item of stockInData.ingredients) {
    const ingredient = await Ingredient.findById(item.ingredient);
    if (!ingredient) continue;
    
    // Generate individual batch number for this ingredient
    const datePart = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const individualBatchNumber = `${stockInData.batchNumber}-${ingredient.name.toUpperCase().substring(0, 3)}-${randomPart}`;
    
    // Convert quantity to ingredient's base unit
    let convertedQuantity = item.quantity;
    if (item.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
      convertedQuantity = convertToBaseUnit(item.quantity, item.unit, ingredient.unit);
    }
    
    // Create ingredient batch
    const batch = await IngredientBatch.create({
      ingredient: item.ingredient,
      batchNumber: individualBatchNumber,
      originalQuantity: convertedQuantity,
      currentQuantity: convertedQuantity,
      unit: ingredient.unit, // Use ingredient's base unit
      stockInDate: stockInData.date || new Date(),
      expirationDate: item.expirationDate, // Can be null for non-perishable items
      stockInRecord: stockInId,
      ingredientSnapshot: item.ingredientSnapshot
    });
    
    createdBatches.push(batch);
    
    // Update the stock-in record with batch reference
    item.createdBatch = batch._id;
    item.individualBatchNumber = individualBatchNumber;
  }
  
  return createdBatches;
};

/**
 * Deduct quantity using FIFO logic
 */
export const deductQuantityFIFO = async (ingredientId, quantityToDeduct, unit, reason = "manual") => {
  const ingredient = await Ingredient.findById(ingredientId);
  if (!ingredient) {
    throw new Error("Ingredient not found");
  }
  
  // Convert quantity to ingredient's base unit
  let convertedQuantity = quantityToDeduct;
  if (unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
    convertedQuantity = convertToBaseUnit(quantityToDeduct, unit, ingredient.unit);
  }
  
  // Get active batches in FIFO order (oldest first)
  const activeBatches = await IngredientBatch.getActiveBatches(ingredientId);
  
  if (activeBatches.length === 0) {
    throw new Error(`No active batches available for ${ingredient.name}`);
  }
  
  // Check if we have enough total quantity
  const totalAvailable = activeBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
  if (totalAvailable < convertedQuantity) {
    throw new Error(`Insufficient stock. Available: ${totalAvailable} ${ingredient.unit}, Requested: ${convertedQuantity} ${ingredient.unit}`);
  }
  
  const deductionDetails = [];
  let remainingToDeduct = convertedQuantity;
  
  // Deduct from batches in FIFO order
  for (const batch of activeBatches) {
    if (remainingToDeduct <= 0) break;
    
    const deductFromThisBatch = Math.min(remainingToDeduct, batch.currentQuantity);
    
    // Deduct from batch
    batch.deductQuantity(deductFromThisBatch);
    await batch.save();
    
    deductionDetails.push({
      batchNumber: batch.batchNumber,
      quantityDeducted: deductFromThisBatch,
      remainingInBatch: batch.currentQuantity,
      expirationDate: batch.expirationDate,
      batchId: batch._id
    });
    
    remainingToDeduct -= deductFromThisBatch;
  }
  
  // Update ingredient total quantity
  ingredient.quantity = Math.max(0, ingredient.quantity - convertedQuantity);
  await ingredient.save();
  
  return {
    totalDeducted: convertedQuantity,
    unit: ingredient.unit,
    deductionDetails,
    remainingStock: ingredient.quantity
  };
};

/**
 * Check for expired batches and create automatic spoilage records
 */
export const processExpiredBatches = async (systemUserId) => {
  try {
    console.log("🔍 Checking for expired batches...");
    
    // Find all expired batches that haven't been processed (only those with expiration dates)
    const expiredBatches = await IngredientBatch.find({
      status: 'active',
      expirationDate: { $exists: true, $lt: new Date() }, // Only check batches with expiration dates
      currentQuantity: { $gt: 0 }
    }).populate('ingredient');
    
    if (expiredBatches.length === 0) {
      console.log("✅ No expired batches found");
      return { processedBatches: 0, spoilageRecords: 0 };
    }
    
    console.log(`⚠️ Found ${expiredBatches.length} expired batches`);
    
    // Group expired batches by ingredient for efficient spoilage record creation
    const expiredByIngredient = {};
    
    for (const batch of expiredBatches) {
      const ingredientId = batch.ingredient._id.toString();
      
      if (!expiredByIngredient[ingredientId]) {
        expiredByIngredient[ingredientId] = {
          ingredient: batch.ingredient,
          batches: []
        };
      }
      
      expiredByIngredient[ingredientId].batches.push(batch);
    }
    
    let spoilageRecordsCreated = 0;
    let batchesProcessed = 0;
    
    // Create spoilage records for each ingredient
    for (const [ingredientId, data] of Object.entries(expiredByIngredient)) {
      const ingredient = data.ingredient;
      const batches = data.batches;
      
      // Prepare spoilage ingredients
      const spoilageIngredients = [];
      let totalWaste = 0;
      
      for (const batch of batches) {
        spoilageIngredients.push({
          ingredient: batch.ingredient._id,
          ingredientSnapshot: batch.ingredientSnapshot,
          quantity: batch.currentQuantity,
          unit: batch.unit,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate,
          spoilageReason: "expired",
          sourceBatch: batch._id
        });
        
        totalWaste += batch.currentQuantity;
        
        // Update batch status and deduct from ingredient
        batch.status = 'expired';
        await batch.save();
        
        // Deduct from ingredient total
        ingredient.quantity = Math.max(0, ingredient.quantity - batch.currentQuantity);
        batch.currentQuantity = 0; // Mark as fully spoiled
        await batch.save();
        
        batchesProcessed++;
      }
      
      await ingredient.save();
      
      // Create automatic spoilage record
      const spoilageRecord = await Spoilage.create({
        personInCharge: systemUserId,
        spoilageType: "auto_expired",
        ingredients: spoilageIngredients,
        totalWaste,
        remarks: `Automatic spoilage: ${batches.length} expired batch(es) of ${ingredient.name}`
      });
      
      spoilageRecordsCreated++;
      
      console.log(`📝 Created automatic spoilage record for ${ingredient.name}: ${totalWaste} ${ingredient.unit} from ${batches.length} batch(es)`);
    }
    
    console.log(`✅ Processed ${batchesProcessed} expired batches, created ${spoilageRecordsCreated} spoilage records`);
    
    return {
      processedBatches: batchesProcessed,
      spoilageRecords: spoilageRecordsCreated,
      expiredIngredients: Object.keys(expiredByIngredient).length
    };
    
  } catch (error) {
    console.error("❌ Error processing expired batches:", error);
    throw error;
  }
};

/**
 * Get batch information for an ingredient
 */
export const getIngredientBatches = async (ingredientId, includeExpired = false) => {
  const query = { ingredient: ingredientId };
  
  if (!includeExpired) {
    query.status = 'active';
    query.currentQuantity = { $gt: 0 };
  }
  
  const batches = await IngredientBatch.find(query)
    .populate('ingredient')
    .sort({ stockInDate: 1 }); // FIFO order
  
  return batches;
};

/**
 * Get upcoming expiration alerts
 */
export const getExpirationAlerts = async (daysAhead = 7) => {
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + daysAhead);
  
  const upcomingExpired = await IngredientBatch.find({
    status: 'active',
    currentQuantity: { $gt: 0 },
    expirationDate: { 
      $exists: true, // Only check batches with expiration dates
      $gte: new Date(),
      $lte: alertDate 
    }
  })
  .populate('ingredient')
  .sort({ expirationDate: 1 });
  
  return upcomingExpired;
};

/**
 * Capitalize text helper for auto-caps feature
 */
export const capitalizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.toUpperCase().trim();
};

export default {
  createBatchesFromStockIn,
  deductQuantityFIFO,
  processExpiredBatches,
  getIngredientBatches,
  getExpirationAlerts,
  capitalizeText
};