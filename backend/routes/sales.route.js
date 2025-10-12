// backend/routes/sales.routes.js
import express from "express";
import {
  createSales,
  createSalesFromTransactions,
  getSales,
  getSale,
  getSalesSummary,
  getSalesByDate,
  getSalesByBatchNumber,
} from "../controllers/sales.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// GET summary (must be before /:id to avoid route conflict)
router.get("/summary", auth, getSalesSummary);

// GET sales by date (e.g., /sales/date/2025-10-09)
router.get("/date/:date", auth, getSalesByDate);

// GET sales by batch number (e.g., /sales/batch/BATCH-2025-10-09)
router.get("/batch/:batchNumber", auth, getSalesByBatchNumber);

// POST create sales manually
router.post("/", auth, createSales);

// POST create sales from transactions
router.post("/from-transactions", auth, createSalesFromTransactions);

// GET all sales
router.get("/", auth, getSales);

// GET single sales batch by ID
router.get("/:id", auth, getSale);

export default router;