import Spoilage from "../models/Spoilage.js";
import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// --- Conversion helper ---
const unitConversion = {
  ml: { ml: 1, L: 1000 },
  L: { ml: 1000, L: 1 },
  g: { g: 1, kg: 1000 },
  kg: { g: 1000, kg: 1 },
  pcs: { pcs: 1 },
};

function convertToBaseUnit(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;
  if (unitConversion[toUnit]?.[fromUnit]) {
    return value * unitConversion[toUnit][fromUnit];
  }
  throw new Error(`Unit conversion not supported: ${fromUnit} → ${toUnit}`);
}

// --- CREATE Spoilage ---
export const createSpoilage = async (req, res) => {
  try {
    const { personInCharge, ingredients, remarks } = req.body; // Add personInCharge here

    if (!personInCharge) {
      return res.status(400).json({ message: "Person in charge is required." });
    }

    if (!ingredients || ingredients.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one ingredient is required." });
    }

    let totalWaste = 0;

    // Loop through each spoiled ingredient
    for (const item of ingredients) {
      const ing = await Ingredient.findById(item.ingredient);
      if (!ing) continue;

      // Convert unit before deducting
      const convertedQty = convertToBaseUnit(
        item.quantity,
        item.unit,
        ing.unit
      );
      ing.quantity = Math.max(0, ing.quantity - convertedQty);
      await ing.save();

      totalWaste += convertedQty;
    }

    // Create spoilage record
    const doc = await Spoilage.create({
      personInCharge: personInCharge, // Use the one from req.body
      ingredients,
      totalWaste,
      remarks,
    });

    // Log activity
    await logActivity(
      req,
      "CREATE_SPOILAGE",
      `Spoilage recorded: ${ingredients.length} ingredients, total waste ${totalWaste}`
    );

    res.status(201).json(doc);
  } catch (err) {
    console.error("Error creating spoilage:", err);
    res.status(500).json({ message: err.message });
  }
};

// --- GET all Spoilages ---
export const getSpoilages = async (req, res) => {
  try {
    const list = await Spoilage.find()
      .populate("personInCharge")
      .populate("ingredients.ingredient")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- GET single Spoilage ---
export const getSpoilage = async (req, res) => {
  try {
    const doc = await Spoilage.findById(req.params.id)
      .populate("personInCharge")
      .populate("ingredients.ingredient");

    if (!doc) return res.status(404).json({ message: "Not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- DELETE Spoilage ---
export const deleteSpoilage = async (req, res) => {
  try {
    const deleted = await Spoilage.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ message: "Spoilage not found" });

    // Restore stock for all affected ingredients
    for (const item of deleted.ingredients) {
      const ing = await Ingredient.findById(item.ingredient);
      if (!ing) continue;

      const convertedQty = convertToBaseUnit(
        item.quantity,
        item.unit,
        ing.unit
      );
      ing.quantity += convertedQty;
      await ing.save();
    }

    // Log activity
    await logActivity(
      req,
      "DELETE_SPOILAGE",
      `Restored stock from spoilage of ${deleted.ingredients.length} items`
    );

    res.json({ message: "Spoilage removed & stock restored" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
