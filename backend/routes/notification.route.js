// backend/routes/notification.route.js
import express from "express";
import { getNotifications, triggerNotifications } from "../controllers/notification.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/", auth, getNotifications);
router.post("/trigger", auth, triggerNotifications); 
export default router;