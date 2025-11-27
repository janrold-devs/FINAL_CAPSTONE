// controllers/auth.controller.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { sendPendingApprovalEmail } from "../services/emailService.js";

export const register = async (req, res) => {
  try {
    console.log("Register request body:", req.body);

    const { firstName, lastName, username, password, email } = req.body;

    if (!firstName || !lastName || !username || !password || !email) {
      console.log("Missing fields:", {
        firstName,
        lastName,
        username,
        password: !!password,
        email,
      });
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });
    if (existingUser) {
      console.log("Username or email already exists:", username, email);
      return res.status(400).json({ message: "Username or email already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with pending status
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      role: "staff",
      status: "pending",
    });

    console.log("User created with pending status:", user.username);

    // Send pending approval email
    await sendPendingApprovalEmail(user);

    // Log admin notification
    await logActivity(
      req,
      "USER_REGISTRATION_REQUEST",
      `New user registration pending approval: ${firstName} ${lastName} (${username}) - ${email}`
    );

    res.status(201).json({
      message: "Registration submitted for approval. You will receive an email notification once your account is approved.",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    console.log("Login request body:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Missing credentials");
      return res
        .status(400)
        .json({ message: "Username and password required." });
    }

    // Find user by username
    const user = await User.findOne({ username });
    console.log("Found user:", user ? user.username : "No user found");

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Check if user is approved
    if (user.status !== "approved") {
      console.log("User not approved:", username);
      return res.status(403).json({
        message: "Your account is pending approval. Please wait for administrator approval.",
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      console.log("User is deactivated:", username);
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    // Return user data without password
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      status: user.status,
      token,
    };

    console.log("Login successful for:", username);
    res.json(userResponse);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
};