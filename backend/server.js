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
import notificationRoutes from "./routes/notification.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import adminRoutes from "./routes/admin.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Determine environment
const isProduction = ENV.NODE_ENV === 'production';

// CORS configuration - UPDATE FOR RENDER
const corsOptions = {
  origin: isProduction 
    ? ["https://kkopitea-dasma.com", "https://www.kkopitea-dasma.com", "https://kkopitea-backend.onrender.com", "http://localhost:3000"] 
    : ["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
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
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    // Allow CORS para sa mga images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

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
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

// ⛔️ REMOVED: Frontend serving code (Handled by Hostinger)

// Connect to database immediately
connectDB();

// Export the app for use by root server.js
export default app;

// Only start server directly if not in production (for local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = ENV.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`🚀 Backend server running in development mode on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
  });
} else {
  // Production - use Render's port
  const PORT = process.env.PORT || 10000;
  server.listen(PORT, () => {
    console.log(`🚀 Backend server running in production on port ${PORT}`);
  });
}

export { io };