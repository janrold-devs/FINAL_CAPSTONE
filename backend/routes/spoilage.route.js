// backend/routes/spoilage.route.js
import express from "express";
import { createSpoilage, getSpoilages, getSpoilage, deleteSpoilage } from "../controllers/spoilage.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", auth, createSpoilage);
router.get("/", auth, getSpoilages);
router.get("/:id", auth, getSpoilage);
router.delete("/:id", auth, deleteSpoilage);

export default router;
