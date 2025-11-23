// backend/routes/transaction.route.js
import express from "express";
import {
  createTransaction,
  getTransactions,
  getTransaction,
  deleteTransaction,
  checkStockAvailability
} from "../controllers/transaction.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/check-stock", auth, checkStockAvailability);
router.post("/", auth, createTransaction);
router.get("/", auth, getTransactions);
router.get("/:id", auth, getTransaction);
router.delete("/:id", auth, deleteTransaction);

export default router;