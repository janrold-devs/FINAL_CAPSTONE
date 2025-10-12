// backend/controllers/activitylog.controller.js
import ActivityLog from "../models/ActivityLog.js";

export const createActivity = async (req, res) => {
  try {
    const doc = await ActivityLog.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().populate("user", "-password").sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
