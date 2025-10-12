import Product from "../models/Product.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import { deleteOldImage } from "../middleware/upload.middleware.js";

export const createProduct = async (req, res) => {
  try {
    const { productName, size, price, category, status, ingredients } = req.body;

    // Parse ingredients if it's a string (from FormData)
    const parsedIngredients = typeof ingredients === "string" 
      ? JSON.parse(ingredients) 
      : ingredients;

    const data = {
      productName,
      size,
      price: Number(price),
      category,
      status,
      ingredients: parsedIngredients,
      image: req.file ? `/uploads/products/${req.file.filename}` : "",
    };

    const doc = await Product.create(data);

    await logActivity(
      req,
      "CREATE_PRODUCT",
      `Created product: ${doc.productName} (${doc.category})`
    );

    res.status(201).json(doc);
  } catch (err) {
    // Delete uploaded file if product creation fails
    if (req.file) {
      deleteOldImage(`/uploads/products/${req.file.filename}`);
    }
    console.error("Error creating product:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const list = await Product.find().populate("ingredients.ingredient");
    res.json(list);
  } catch (err) {
    console.error("Error getting products:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "ingredients.ingredient"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error getting product:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productName, size, price, category, status, ingredients, image } = req.body;

    // Find existing product
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      if (req.file) {
        deleteOldImage(`/uploads/products/${req.file.filename}`);
      }
      return res.status(404).json({ message: "Product not found" });
    }

    // Parse ingredients if it's a string
    const parsedIngredients = typeof ingredients === "string" 
      ? JSON.parse(ingredients) 
      : ingredients;

    const data = {
      productName,
      size,
      price: Number(price),
      category,
      status,
      ingredients: parsedIngredients,
    };

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (existingProduct.image) {
        deleteOldImage(existingProduct.image);
      }
      data.image = `/uploads/products/${req.file.filename}`;
    } else if (image) {
      // Keep existing image URL
      data.image = image;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    await logActivity(
      req,
      "UPDATE_PRODUCT",
      `Updated product: ${updated.productName} (${updated.category})`
    );

    res.json(updated);
  } catch (err) {
    // Delete uploaded file if update fails
    if (req.file) {
      deleteOldImage(`/uploads/products/${req.file.filename}`);
    }
    console.error("Error updating product:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });

    // Delete associated image
    if (deleted.image) {
      deleteOldImage(deleted.image);
    }

    await logActivity(
      req,
      "DELETE_PRODUCT",
      `Deleted product: ${deleted.productName} (${deleted.category})`
    );

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ message: err.message });
  }
};