// backend/routes/stockin.route.js
import express from "express";
import {
  createStockIn, getStockIns, getStockIn, deleteStockIn
} from "../controllers/stockin.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", auth, createStockIn);
router.get("/", auth, getStockIns);
router.get("/:id", auth, getStockIn);
router.delete("/:id", auth, deleteStockIn);

export default router;
