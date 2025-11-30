import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { logActivity } from "../middleware/activitylogger.middleware.js";

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, username, password, role, email } = req.body;

    if (!firstName || !lastName || !username || !password || !email) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if user already exists
    const exists = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Username or email already used." });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create new user with isActive default to true
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password: hashed,
      role: role || "staff",
      isActive: true,
    });

    // Log activity
    await logActivity(
      req,
      "CREATE_USER",
      `Created a new user: ${firstName} ${lastName} (${username})`
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
    const users = await User.find().select("-password").sort({
      isActive: -1, // Active users first
      createdAt: -1,
    });
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
      `Updated user: ${user.firstName} ${user.lastName} (${user.username})`
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
