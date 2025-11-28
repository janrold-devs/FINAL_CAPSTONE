// controllers/admin.controller.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { sendCredentialsEmail, sendRejectionEmail } from "../services/emailService.js";

export const getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: "pending" }).select("-password").sort({ createdAt: -1 });
    res.json(pendingUsers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    console.log(`Approving user ${id} with password:`, password ? "provided" : "not provided");

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.status !== "pending") {
      return res.status(400).json({ message: "User is not pending approval." });
    }

    // If password is provided, update it
    let plainPassword = password;
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    } else {
      // Generate a random password if not provided
      plainPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      user.password = hashedPassword;
    }

    // Update user status to approved
    user.status = "approved";
    user.isActive = true;
    await user.save();

    console.log(`User ${user.username} approved successfully`);

    // Send credentials email
    const emailSent = await sendCredentialsEmail(user, plainPassword);

    // Log activity
    await logActivity(
      req,
      "USER_APPROVED",
      `Approved user: ${user.firstName} ${user.lastName} (${user.username}) - Email ${emailSent ? 'sent' : 'failed'}`
    );

    res.json({
      message: "User approved successfully.",
      emailSent,
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
    console.error("Error in approveUser:", err);
    res.status(500).json({ message: err.message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log(`Rejecting user ${id} with reason:`, reason);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.status !== "pending") {
      return res.status(400).json({ message: "User is not pending approval." });
    }

    // Update user status to rejected
    user.status = "rejected";
    await user.save();

    console.log(`User ${user.username} rejected successfully`);

    // Send rejection email
    const emailSent = await sendRejectionEmail(user);

    // Log activity
    await logActivity(
      req,
      "USER_REJECTED",
      `Rejected user: ${user.firstName} ${user.lastName} (${user.username}) - Reason: ${reason || 'Not specified'} - Email ${emailSent ? 'sent' : 'failed'}`
    );

    res.json({
      message: "User rejected successfully.",
      emailSent
    });
  } catch (err) {
    console.error("Error in rejectUser:", err);
    res.status(500).json({ message: err.message });
  }
};