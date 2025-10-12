import ItemMovement from "../models/ItemMovement.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";

// CREATE Movement
export const createMovement = async (req, res) => {
  try {
    const doc = await ItemMovement.create(req.body);

    // log activity
    await logActivity(
      req,
      "MOVE_ITEM",
      `Moved ${doc.quantity} ${doc.unit} of ${doc.ingredient} (${doc.actionType}) for "${doc.purpose}" to "${doc.destination}" [Batch: ${doc.batchNumber}]`
    );

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all Movements
export const getMovements = async (req, res) => {
  try {
    const list = await ItemMovement.find()
      .populate("ingredient")
      .populate("movedBy", "-password")
      .sort({ date: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};