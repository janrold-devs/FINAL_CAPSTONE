import IngredientBatch from "../models/IngredientBatch.js";
import Ingredient from "../models/Ingredient.js";
import { 
  processExpiredBatches, 
  getIngredientBatches, 
  getExpirationAlerts 
} from "../services/batchService.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

/**
 * Get all batches for a specific ingredient
 */
export const getIngredientBatchesController = async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { includeExpired = false } = req.query;
    
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: "Ingredient not found"
      });
    }
    
    const batches = await getIngredientBatches(ingredientId, includeExpired === 'true');
    
    // Format batches for frontend display
    const formattedBatches = batches.map(batch => ({
      ...batch.toObject(),
      expirationDate: batch.expirationDate || null, // Ensure null for non-perishable items
      hasExpiration: !!batch.expirationDate,
      isExpired: batch.expirationDate ? new Date() > batch.expirationDate : false
    }));
    
    res.json({
      success: true,
      data: {
        ingredient: {
          _id: ingredient._id,
          name: ingredient.name,
          totalQuantity: ingredient.quantity,
          unit: ingredient.unit
        },
        batches: formattedBatches,
        summary: {
          totalBatches: formattedBatches.length,
          activeBatches: formattedBatches.filter(b => b.status === 'active').length,
          expiredBatches: formattedBatches.filter(b => b.status === 'expired').length,
          depletedBatches: formattedBatches.filter(b => b.status === 'depleted').length,
          perishableBatches: formattedBatches.filter(b => b.hasExpiration).length,
          nonPerishableBatches: formattedBatches.filter(b => !b.hasExpiration).length
        }
      }
    });
  } catch (error) {
    console.error("Error fetching ingredient batches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ingredient batches"
    });
  }
};

/**
 * Get all active batches across all ingredients
 */
export const getAllActiveBatches = async (req, res) => {
  try {
    const { sortBy = 'expirationDate', sortOrder = 'asc', limit = 100 } = req.query;
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const batches = await IngredientBatch.find({
      status: 'active',
      currentQuantity: { $gt: 0 }
    })
    .populate('ingredient')
    .sort(sortOptions)
    .limit(parseInt(limit));
    
    // Format batches for frontend display
    const formattedBatches = batches.map(batch => ({
      ...batch.toObject(),
      expirationDate: batch.expirationDate || null,
      hasExpiration: !!batch.expirationDate,
      isExpired: batch.expirationDate ? new Date() > batch.expirationDate : false
    }));
    
    res.json({
      success: true,
      data: formattedBatches,
      count: formattedBatches.length
    });
  } catch (error) {
    console.error("Error fetching active batches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active batches"
    });
  }
};

/**
 * Get expiration alerts
 */
export const getExpirationAlertsController = async (req, res) => {
  try {
    const { daysAhead = 7 } = req.query;
    
    const alerts = await getExpirationAlerts(parseInt(daysAhead));
    
    // Group by urgency (only for batches with expiration dates)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const groupedAlerts = {
      expired: alerts.filter(batch => batch.expirationDate && batch.expirationDate < now),
      expiresToday: alerts.filter(batch => 
        batch.expirationDate && batch.expirationDate >= now && batch.expirationDate < tomorrow
      ),
      expiresThisWeek: alerts.filter(batch => 
        batch.expirationDate && batch.expirationDate >= tomorrow && batch.expirationDate < nextWeek
      ),
      expiresLater: alerts.filter(batch => batch.expirationDate && batch.expirationDate >= nextWeek)
    };
    
    // Format alerts for frontend
    const formattedAlerts = alerts.map(batch => ({
      ...batch.toObject(),
      expirationDate: batch.expirationDate || null,
      hasExpiration: !!batch.expirationDate,
      isExpired: batch.expirationDate ? batch.expirationDate < now : false
    }));
    
    res.json({
      success: true,
      data: {
        all: formattedAlerts,
        grouped: groupedAlerts,
        summary: {
          total: formattedAlerts.length,
          expired: groupedAlerts.expired.length,
          expiresToday: groupedAlerts.expiresToday.length,
          expiresThisWeek: groupedAlerts.expiresThisWeek.length,
          expiresLater: groupedAlerts.expiresLater.length
        }
      }
    });
  } catch (error) {
    console.error("Error fetching expiration alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expiration alerts"
    });
  }
};

/**
 * Process expired batches manually
 */
export const processExpiredBatchesController = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }
    
    const result = await processExpiredBatches(req.user._id);
    
    // Log activity
    await logActivity(
      req,
      "PROCESS_EXPIRED_BATCHES",
      `Processed ${result.processedBatches} expired batches, created ${result.spoilageRecords} spoilage records`
    );
    
    res.json({
      success: true,
      message: `Successfully processed expired batches`,
      data: result
    });
  } catch (error) {
    console.error("Error processing expired batches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process expired batches",
      error: error.message
    });
  }
};

/**
 * Get batch details by batch number
 */
export const getBatchByNumber = async (req, res) => {
  try {
    const { batchNumber } = req.params;
    
    const batch = await IngredientBatch.findOne({ batchNumber })
      .populate('ingredient')
      .populate('stockInRecord');
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }
    
    // Format batch for frontend display
    const formattedBatch = {
      ...batch.toObject(),
      expirationDate: batch.expirationDate || null,
      hasExpiration: !!batch.expirationDate,
      isExpired: batch.expirationDate ? new Date() > batch.expirationDate : false
    };
    
    res.json({
      success: true,
      data: formattedBatch
    });
  } catch (error) {
    console.error("Error fetching batch:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch batch details"
    });
  }
};

/**
 * Get batch history and usage
 */
export const getBatchHistory = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await IngredientBatch.findById(batchId)
      .populate('ingredient')
      .populate('stockInRecord');
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }
    
    // Find spoilage records that used this batch
    const Spoilage = (await import("../models/Spoilage.js")).default;
    const spoilageRecords = await Spoilage.find({
      "ingredients.sourceBatch": batchId
    }).populate('personInCharge');
    
    // Calculate usage history
    const usageHistory = [];
    let remainingQuantity = batch.originalQuantity;
    
    // Add stock-in as first entry
    usageHistory.push({
      type: "stock_in",
      date: batch.stockInDate,
      quantity: batch.originalQuantity,
      remainingQuantity: remainingQuantity,
      reference: batch.stockInRecord,
      description: `Initial stock-in: ${batch.originalQuantity} ${batch.unit}`
    });
    
    // Add spoilage entries
    for (const spoilage of spoilageRecords) {
      const spoilageItem = spoilage.ingredients.find(
        item => item.sourceBatch && item.sourceBatch.toString() === batchId
      );
      
      if (spoilageItem) {
        remainingQuantity -= spoilageItem.quantity;
        usageHistory.push({
          type: "spoilage",
          date: spoilage.createdAt,
          quantity: -spoilageItem.quantity,
          remainingQuantity: Math.max(0, remainingQuantity),
          reference: spoilage._id,
          description: `Spoilage: ${spoilageItem.quantity} ${spoilageItem.unit} (${spoilageItem.spoilageReason})`,
          reason: spoilageItem.spoilageReason,
          personInCharge: spoilage.personInCharge
        });
      }
    }
    
    // Sort by date
    usageHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      data: {
        batch,
        usageHistory,
        summary: {
          originalQuantity: batch.originalQuantity,
          currentQuantity: batch.currentQuantity,
          totalUsed: batch.originalQuantity - batch.currentQuantity,
          spoilageRecords: spoilageRecords.length,
          status: batch.status
        }
      }
    });
  } catch (error) {
    console.error("Error fetching batch history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch batch history"
    });
  }
};

/**
 * Get dashboard statistics for batch management
 */
export const getBatchStatistics = async (req, res) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get various batch counts
    const [
      totalActiveBatches,
      expiredBatches,
      expiresToday,
      expiresThisWeek,
      depletedBatches,
      totalIngredients,
      nonPerishableBatches
    ] = await Promise.all([
      IngredientBatch.countDocuments({ status: 'active', currentQuantity: { $gt: 0 } }),
      IngredientBatch.countDocuments({ status: 'expired' }),
      IngredientBatch.countDocuments({ 
        status: 'active',
        currentQuantity: { $gt: 0 },
        expirationDate: { $exists: true, $gte: now, $lt: tomorrow }
      }),
      IngredientBatch.countDocuments({ 
        status: 'active',
        currentQuantity: { $gt: 0 },
        expirationDate: { $exists: true, $gte: tomorrow, $lt: nextWeek }
      }),
      IngredientBatch.countDocuments({ status: 'depleted' }),
      Ingredient.countDocuments({ deleted: { $ne: true } }),
      IngredientBatch.countDocuments({ 
        status: 'active',
        currentQuantity: { $gt: 0 },
        expirationDate: { $exists: false }
      })
    ]);
    
    // Get ingredients with low stock (based on alert levels)
    const lowStockIngredients = await Ingredient.find({
      deleted: { $ne: true },
      $expr: { $lte: ["$quantity", "$alert"] }
    }).countDocuments();
    
    res.json({
      success: true,
      data: {
        batches: {
          totalActive: totalActiveBatches,
          expired: expiredBatches,
          depleted: depletedBatches,
          expiresToday,
          expiresThisWeek,
          nonPerishable: nonPerishableBatches
        },
        ingredients: {
          total: totalIngredients,
          lowStock: lowStockIngredients
        },
        alerts: {
          urgent: expiredBatches + expiresToday,
          warning: expiresThisWeek,
          lowStock: lowStockIngredients
        }
      }
    });
  } catch (error) {
    console.error("Error fetching batch statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch batch statistics"
    });
  }
};

/**
 * Get expired batches for spoilage modal
 */
export const getExpiredBatchesForSpoilage = async (req, res) => {
  try {
    const { ingredientId } = req.query;
    
    let query = {
      $or: [
        { status: 'expired' },
        { 
          status: 'active',
          expirationDate: { $lt: new Date() },
          currentQuantity: { $gt: 0 }
        }
      ]
    };
    
    // If specific ingredient requested
    if (ingredientId) {
      query.ingredient = ingredientId;
    }
    
    const expiredBatches = await IngredientBatch.find(query)
      .populate('ingredient')
      .sort({ expirationDate: 1 });
    
    // Group by ingredient for easier frontend handling
    const groupedBatches = {};
    expiredBatches.forEach(batch => {
      const ingredientId = batch.ingredient._id.toString();
      if (!groupedBatches[ingredientId]) {
        groupedBatches[ingredientId] = {
          ingredient: batch.ingredient,
          batches: []
        };
      }
      groupedBatches[ingredientId].batches.push(batch);
    });
    
    res.json({
      success: true,
      data: {
        expiredBatches,
        groupedByIngredient: groupedBatches,
        totalExpired: expiredBatches.length
      }
    });
  } catch (error) {
    console.error("Error fetching expired batches for spoilage:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expired batches"
    });
  }
};