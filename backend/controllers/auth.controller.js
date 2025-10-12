// backend/controllers/auth.controller.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "Missing required fields." });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already used." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hashed, role });
    const token = createToken(user);
    const safeUser = { ...user.toObject() };
    delete safeUser.password;
    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials." });

    const token = createToken(user);
    const safeUser = { ...user.toObject() };
    delete safeUser.password;
    res.json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
