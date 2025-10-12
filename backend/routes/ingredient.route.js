// backend/routes/ingredient.route.js
import express from "express";
import {
  createIngredient,
  getIngredients,
  getIngredient,
  updateIngredient,
  deleteIngredient
} from "../controllers/ingredient.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", auth, createIngredient);
router.get("/", auth, getIngredients);
router.get("/:id", auth, getIngredient);
router.put("/:id", auth, updateIngredient);
router.delete("/:id", auth, deleteIngredient);

export default router;
