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

    // Fetch the latest user data from database to check isActive status
    const user = await User.findById(verified.id).select("isActive");
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    req.user = verified; // attach decoded user data (id, role, email)
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

export default auth;
