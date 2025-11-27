// routes/admin.routes.js
import express from "express";
import { getPendingUsers, approveUser, rejectUser } from "../controllers/admin.controller.js";
import auth from "../middleware/auth.middleware.js";
import role from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/pending-users", auth, role("admin"), getPendingUsers);
router.put("/approve-user/:id", auth, role("admin"), approveUser);
router.put("/reject-user/:id", auth, role("admin"), rejectUser);

export default router;