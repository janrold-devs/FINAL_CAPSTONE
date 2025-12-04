// backend/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ 
      message: "Access Denied. No token provided.",
      code: "NO_TOKEN"
    });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");

    // Fetch the complete user data from database
    const user = await User.findById(verified.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ 
        message: "User not found.",
        code: "USER_NOT_FOUND"
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account is deactivated. Please contact administrator.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Check if user is approved
    if (user.status !== "approved") {
      return res.status(403).json({
        message: "Your account is pending approval. Please wait for administrator approval.",
        code: "ACCOUNT_PENDING"
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    }
    
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        message: "Invalid token.",
        code: "INVALID_TOKEN"
      });
    }
    
    console.error("Auth middleware error:", err);
    return res.status(400).json({ 
      message: "Invalid Token",
      code: "INVALID_TOKEN"
    });
  }
};

export default auth;