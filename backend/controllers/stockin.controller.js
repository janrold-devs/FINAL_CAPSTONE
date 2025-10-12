// backend/controllers/stockin.controller.js
import StockIn from "../models/StockIn.js";
import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// Conversion map (base unit → alternative units)
const unitConversion = {
  ml: { ml: 1, L: 1000 },
  L: { ml: 1000, L: 1 },
  g: { g: 1, kg: 1000 },
  kg: { g: 1000, kg: 1 },
  pcs: { pcs: 1 }
};

// CREATE StockIn with unit conversion + ingredient update
export const createStockIn = async (req, res) => {
  try {
    const { batchNumber, stockman, ingredients } = req.body;

    // Save stock-in document first
    const doc = await StockIn.create({ batchNumber, stockman, ingredients });

    // Update ingredient quantities with unit conversion
    for (const item of ingredients) {
      const ingredient = await Ingredient.findById(item.ingredient);
      if (!ingredient) continue;

      let qtyToAdd = item.quantity;

      // Convert if input unit doesn't match base unit
      if (item.unit && item.unit !== ingredient.unit) {
        const conversions = unitConversion[ingredient.unit];
        if (conversions && conversions[item.unit.toLowerCase()]) {
          qtyToAdd = item.quantity * conversions[item.unit.toLowerCase()];
        } else {
          return res.status(400).json({
            message: `Unit mismatch: cannot convert ${item.unit} to ${ingredient.unit}`
          });
        }
      }

      ingredient.quantity += qtyToAdd;
      await ingredient.save();
    }

    // log activity
    await logActivity(
      req,
      "CREATE_STOCKIN",
      `Stock In: Batch ${doc.batchNumber} by ${doc.stockman || "Unknown"}`
    );

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all StockIns
export const getStockIns = async (req, res) => {
  try {
    const list = await StockIn.find()
      .populate("stockman")
      .populate("ingredients.ingredient")
      .sort({ date: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single StockIn
export const getStockIn = async (req, res) => {
  try {
    const item = await StockIn.findById(req.params.id)
      .populate("stockman")
      .populate("ingredients.ingredient");

    if (!item) return res.status(404).json({ message: "StockIn not found" });

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE StockIn
export const deleteStockIn = async (req, res) => {
  try {
    const deleted = await StockIn.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "StockIn not found" });

    // log activity
    await logActivity(
      req,
      "DELETE_STOCKIN",
      `Deleted Stock In: Batch ${deleted.batchNumber}`
    );

    res.json({ message: "StockIn removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
