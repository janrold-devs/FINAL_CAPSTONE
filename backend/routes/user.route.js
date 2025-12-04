// backend/routes/user.route.js
import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  createUser,
  getCurrentUser
} from "../controllers/user.controller.js";

import auth from "../middleware/auth.middleware.js";
import role from "../middleware/role.middleware.js";

const router = express.Router();

// GET /api/users/me - Get current user profile (CRITICAL for session validation)
router.get("/me", auth, getCurrentUser);

// POST /api/users
router.post("/", auth, role("admin"), createUser);

// GET /api/users
router.get("/", auth, getUsers);

// GET /api/users/:id
router.get("/:id", auth, getUser);

// PUT /api/users/:id
router.put("/:id", auth, role(["admin"]), updateUser);

export default router;