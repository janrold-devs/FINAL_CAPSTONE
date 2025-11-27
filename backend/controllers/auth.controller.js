import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    console.log("Register request body:", req.body);

    const { firstName, lastName, username, password } = req.body;

    if (!firstName || !lastName || !username || !password) {
      console.log("Missing fields:", {
        firstName,
        lastName,
        username,
        password: !!password,
      });
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("Username already exists:", username);
      return res.status(400).json({ message: "Username already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      role: "staff", // Default role for registered users
    });

    console.log("User created successfully:", user.username);

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
      role: user.role,
      isActive: user.isActive,
      token,
    };

    res.status(201).json(userResponse);
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
      role: user.role,
      isActive: user.isActive,
      token,
    };

    console.log("Login successful for:", username);
    res.json(userResponse);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
};
