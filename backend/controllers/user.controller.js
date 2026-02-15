// backend/controllers/user.controller.js
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
      status: "approved", // Set as approved since admin is creating
    });

    // Log activity
    await logActivity(
      req,
      "CREATE_USER",
      `Created a new user: ${firstName} ${lastName} (${username})`,
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

    // Prevent modifying other admins
    if (req.user.role === 'admin' && req.params.id !== req.user._id.toString()) {
      const targetUser = await User.findById(req.params.id);
      if (targetUser && targetUser.role === 'admin') {
        return res.status(403).json({ message: "Admins cannot modify other admin accounts." });
      }
    }

    // If password update is requested, validate current password first
    if (updates.password) {
      // Current password must be provided when updating password
      if (!updates.currentPassword) {
        return res.status(400).json({
          message: "Current password is required to change password.",
        });
      }

      // Fetch the user with password to verify current password
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Verify that the provided current password matches the stored password
      const isPasswordCorrect = await bcrypt.compare(
        updates.currentPassword,
        user.password,
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Current password is incorrect.",
        });
      }

      // Hash the new password
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Remove currentPassword from updates object (don't store it)
    delete updates.currentPassword;

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    // Log activity
    await logActivity(
      req,
      "UPDATE_USER",
      `Updated user: ${user.firstName} ${user.lastName} (${user.username})`,
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Critical: Add this function for session validation
export const getCurrentUser = async (req, res) => {
  try {
    // User is already attached by auth middleware (req.user)
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Fetch fresh user data from database (excluding password)
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Check if user is approved
    if (user.status !== "approved") {
      return res.status(403).json({
        message:
          "Your account is pending approval. Please wait for administrator approval.",
        code: "ACCOUNT_PENDING",
      });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify current password for real-time validation
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    // Fetch the user with password hash
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify that the provided password matches the stored password
    const isCorrect = await bcrypt.compare(password, user.password);

    res.json({
      isCorrect,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
