// backend/routes/user.route.js
import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  createUser,
} from "../controllers/user.controller.js";

import auth from "../middleware/auth.middleware.js";
import role from "../middleware/role.middleware.js";

const router = express.Router();

// POST /api/users
router.post("/", auth, role("admin"), createUser);

// GET /api/users
router.get("/", auth, getUsers);

// GET /api/users/:id
router.get("/:id", auth, getUser);

// PUT /api/users/:id
router.put("/:id", auth, role(["admin"]), updateUser);

// PATCH /api/users/:id/deactivate - Deactivate user
//router.patch("/:id/deactivate", auth, role("admin"), deactivateUser);

// PATCH /api/users/:id/reactivate - Reactivate user
//router.patch("/:id/reactivate", auth, role("admin"), reactivateUser);

export default router;
