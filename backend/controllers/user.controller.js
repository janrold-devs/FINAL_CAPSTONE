import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { logActivity } from "../middleware/activitylogger.middleware.js";

/* CRUD for users (user management) */
export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if user already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already used." });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create new user with isActive default to true
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      role: role || "staff",
      isActive: true,
    });

    // Log activity
    await logActivity(
      req,
      "CREATE_USER",
      `Created a new user: ${firstName} ${lastName} (${email})`
    );

    // Return user without password
    const safeUser = { ...user.toObject() };
    delete safeUser.password;

    res.status(201).json(safeUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    // Log activity
    await logActivity(
      req,
      "UPDATE_USER",
      `Updated user: ${user.firstName} ${user.lastName} (${user.email})`
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
