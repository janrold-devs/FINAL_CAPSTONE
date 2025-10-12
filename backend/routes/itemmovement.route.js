// backend/routes/itemmovement.route.js
import express from "express";
import { createMovement, getMovements } from "../controllers/itemmovement.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", auth,createMovement);
router.get("/", auth, getMovements);

export default router;
