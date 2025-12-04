// backend/routes/product.route.js
import express from "express";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
} from "../controllers/product.controller.js";
import { upload } from "../middleware/cloudinary.middleware.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", auth, upload.single("image"), createProduct);
router.get("/", auth, getProducts);
router.get("/category/:category", auth, getProductsByCategory);
router.get("/:id", auth, getProduct);
router.put("/:id", auth, upload.single("image"), updateProduct);
router.delete("/:id", auth, deleteProduct);

export default router;
