// backend/routes/users.js
import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser
} from "../controllers/user.controller.js";

import auth from "../middleware/auth.middleware.js";
import role from "../middleware/role.middleware.js";

const router = express.Router();

// POST /api/users
router.post("/", auth, role("admin"), createUser);

// GET /api/users
router.get("/", auth, role("admin"), getUsers);

// GET /api/users/:id
router.get("/:id", auth, getUser);

// PUT /api/users/:id
router.put("/:id", auth, role(["admin"]), updateUser);

// DELETE /api/users/:id
router.delete("/:id", auth, role("admin"), deleteUser);

export default router;
