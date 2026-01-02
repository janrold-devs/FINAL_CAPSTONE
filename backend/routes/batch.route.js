import express from "express";
import {
  getIngredientBatchesController,
  getAllActiveBatches,
  getExpirationAlertsController,
  processExpiredBatchesController,
  getBatchByNumber,
  getBatchHistory,
  getBatchStatistics,
  getExpiredBatchesForSpoilage
} from "../controllers/batch.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply authentication to all batch routes
router.use(auth);

// Get batch statistics for dashboard
router.get("/statistics", getBatchStatistics);

// Get expiration alerts
router.get("/expiration-alerts", getExpirationAlertsController);

// Get expired batches for spoilage modal
router.get("/expired-for-spoilage", getExpiredBatchesForSpoilage);

// Process expired batches manually
router.post("/process-expired", processExpiredBatchesController);

// Get all active batches
router.get("/active", getAllActiveBatches);

// Get batch by batch number
router.get("/number/:batchNumber", getBatchByNumber);

// Get batch history and usage
router.get("/history/:batchId", getBatchHistory);

// Get batches for specific ingredient
router.get("/ingredient/:ingredientId", getIngredientBatchesController);

export default router;