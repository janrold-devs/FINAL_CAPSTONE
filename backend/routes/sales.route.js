// backend/routes/sales.routes.js
import express from "express";
import {
  getSales,
  getSale,
  getSalesSummary,
  getSalesByDate,
  getBestSellingProducts,
  refreshAndReconcileSales,
  getVerifiedSale,
} from "../controllers/sales.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/refresh-reconcile", auth, refreshAndReconcileSales);
router.get("/verified/:id", auth, getVerifiedSale);

// GET best selling products
router.get("/analytics/best-selling", auth, getBestSellingProducts);

// GET summary (must be before /:id to avoid route conflict)
router.get("/summary", auth, getSalesSummary);

// GET sales by date (e.g., /sales/date/2025-10-09)
router.get("/date/:date", auth, getSalesByDate);

// GET all sales
router.get("/", auth, getSales);

// GET single sales batch by ID
router.get("/:id", auth, getSale);

export default router;
