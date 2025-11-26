import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token)
    return res
      .status(401)
      .json({ message: "Access Denied. No token provided." });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the complete user data from database
    const user = await User.findById(verified.id).select(
      "_id isActive name email role"
    ); // Add _id here
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    req.user = user; // attach the complete user document with _id
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

export default auth;
