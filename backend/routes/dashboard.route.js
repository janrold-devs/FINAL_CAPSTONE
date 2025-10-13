// backend/routes/dashboard.route.js
import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/stats", auth, getDashboardStats);

export default router;