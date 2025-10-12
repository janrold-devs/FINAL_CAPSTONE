//server.js

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());

connectDB();

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));