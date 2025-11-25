// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { ENV } from "./lib/env.js";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import productRoutes from "./routes/product.route.js";
import ingredientRoutes from "./routes/ingredient.route.js";
import stockInRoutes from "./routes/stockin.route.js";
import spoilageRoutes from "./routes/spoilage.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import salesRoutes from "./routes/sales.route.js";
import activityLogRoutes from "./routes/activitylog.route.js";
import itemTrackerRoutes from "./routes/itemmovement.route.js";
import notificationRoutes from "./routes/notification.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join_notifications", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined notification room`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Make io available to routes
app.set("io", io);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/stockin", stockInRoutes);
app.use("/api/spoilages", spoilageRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/activitylogs", activityLogRoutes);
app.use("/api/itemtracker", itemTrackerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = ENV.PORT || 8000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  connectDB();
});

export { io };