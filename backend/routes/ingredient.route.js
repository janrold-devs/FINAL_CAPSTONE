// backend/routes/ingredient.route.js
import express from "express";
import {
  createIngredient,
  getIngredients,
  getIngredient,
  updateIngredient,
  deleteIngredient,
  getArchivedIngredients,
  restoreIngredient,
  permanentlyDeleteIngredient
} from "../controllers/ingredient.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// Main ingredient routes
router.post("/", auth, createIngredient);
router.get("/", auth, getIngredients);
router.get("/:id", auth, getIngredient);
router.put("/:id", auth, updateIngredient);
router.delete("/:id", auth, deleteIngredient);

// Archive management routes
router.get("/archive/list", auth, getArchivedIngredients);
router.post("/archive/:id/restore", auth, restoreIngredient);
router.delete("/archive/:id/permanent", auth, permanentlyDeleteIngredient);

export default router;
