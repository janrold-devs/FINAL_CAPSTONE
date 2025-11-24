// backend/controllers/ingredient.controller.js
import Ingredient from "../models/Ingredient.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { emitNotificationsToAll } from "../utils/socketUtils.js";

export const createIngredient = async (req, res) => {
  try {
    const body = req.body;
    const created = await Ingredient.create(body);

    // Log activity
    await logActivity(req, "ADD_INGREDIENT", `Added new ingredient: ${created.name}`);

    // Emit real-time notifications
    const io = req.app.get("io");
    await emitNotificationsToAll(io);

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getIngredients = async (req, res) => {
  try {
    const list = await Ingredient.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getIngredient = async (req, res) => {
  try {
    const item = await Ingredient.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Ingredient not found." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const updated = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Ingredient not found." });

    // Log activity
    await logActivity(req, "UPDATE_INGREDIENT", `Updated ingredient: ${updated.name}`);

    // Emit real-time notifications
    const io = req.app.get("io");
    await emitNotificationsToAll(io);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteIngredient = async (req, res) => {
  try {
    const deleted = await Ingredient.findByIdAndDelete(req.params.id);
    if (deleted) {
      // Log activity
      await logActivity(req, "DELETE_INGREDIENT", `Deleted ingredient: ${deleted.name}`);
      
      // Emit real-time notifications
      const io = req.app.get("io");
      await emitNotificationsToAll(io);
    }
    res.json({ message: "Ingredient deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateIngredientStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const updated = await Ingredient.findByIdAndUpdate(
      id,
      { quantity },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Ingredient not found." });
    }

    // Emit real-time notifications
    const io = req.app.get("io");
    await emitNotificationsToAll(io);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};