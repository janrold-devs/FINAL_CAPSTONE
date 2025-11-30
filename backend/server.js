// backend/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { ENV } from "./lib/env.js";

// Import routes
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
import adminRoutes from "./routes/admin.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Determine environment
const isProduction = ENV.NODE_ENV === 'production';

// CORS configuration
const corsOptions = {
  origin: isProduction 
    ? ["https://kkopitea-dasma.com", "https://www.kkopitea-dasma.com"]
    : ["http://localhost:3000", "http://localhost:8000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// Socket.IO configuration
const io = new Server(server, {
  cors: corsOptions
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

app.use(cors(corsOptions));
app.use(express.json());

// Serve uploads statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
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
app.use("/api/admin", adminRoutes);

// Serve frontend in production
if (isProduction) {
  // Path to frontend dist folder from backend directory
  const frontendPath = path.join(__dirname, "../../frontend/dist");
  
  app.use(express.static(frontendPath));
  
  // Handle SPA routing - serve index.html for all unknown routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
  
  console.log("Production mode: Serving frontend from", frontendPath);
}

const PORT = ENV.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running in ${isProduction ? 'production' : 'development'} mode on port ${PORT}`);
  connectDB();
});

export { io };