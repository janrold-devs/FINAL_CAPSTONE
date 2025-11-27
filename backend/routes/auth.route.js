import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

// Test route to check if auth routes are working
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes are working!" });
});

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

export default router;
