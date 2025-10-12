// backend/routes/activitylog.route.js
import express from "express";
import { createActivity, getActivityLogs } from "../controllers/activitylog.controller.js";
import auth from "../middleware/auth.middleware.js";
import role from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/", auth, createActivity);
router.get("/", auth, role(["admin"]), getActivityLogs);

export default router;
