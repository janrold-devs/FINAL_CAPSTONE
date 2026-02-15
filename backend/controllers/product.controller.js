// product.controller.js
import Product from "../models/Product.js";
import { logActivity } from "../middleware/activitylogger.middleware.js";
import {
  deleteCloudinaryImage,
  getCloudinaryPublicId,
} from "../middleware/cloudinary.middleware.js";

export const createProduct = async (req, res) => {
  try {
    // normalize incoming category to UPPERCASE
    if (req.body.category)
      req.body.category = (req.body.category || "").trim().toUpperCase();
    if (req.body.productName)
      req.body.productName = (req.body.productName || "").trim().toUpperCase();

    const { productName, sizes, category, status, ingredients, isAddon } =
      req.body;

    // Check for duplicate product name
    const existingProduct = await Product.findOne({
      productName: productName.trim().toUpperCase()
    });

    if (existingProduct) {
      // Delete uploaded file if product creation fails
      if (req.file) {
        await deleteCloudinaryImage(req.file.path);
      }
      return res.status(400).json({
        message: `Product "${productName}" already exists. Please use a different name.`
      });
    }

    // Parse ingredients if it's a string (from FormData)
    const parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    const parsedIngredients =
      typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients;

    // Validate that ingredients are provided
    if (!parsedIngredients || parsedIngredients.length === 0) {
      // Delete uploaded file if validation fails
      if (req.file) {
        await deleteCloudinaryImage(req.file.path);
      }
      return res.status(400).json({
        message: "At least one ingredient or material is required"
      });
    }

    const data = {
      productName,
      sizes: parsedSizes,
      category,
      status,
      ingredients: parsedIngredients,
      image: req.file ? req.file.path : "",
      isAddon: isAddon || false, // Add this line for add-ons
    };

    const doc = await Product.create(data);

    await logActivity(
      req,
      "CREATE_PRODUCT",
      `Created ${data.isAddon ? "add-on" : "product"}: ${doc.productName} (${doc.category
      })`
    );

    res.status(201).json(doc);
  } catch (err) {
    // Delete uploaded file if product creation fails
    if (req.file) {
      deleteCloudinaryImage(req.file.path);
    }
    console.error("Error creating product:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const includeAddons = req.query.includeAddons === "true";
    const includeRegular = req.query.includeRegular !== "false"; // Default to true

    let query = { status: { $ne: "unavailable" } };

    if (!includeAddons && includeRegular) {
      // Only exclude add-ons but include regular products
      query.$and = [
        { $or: [{ isAddon: { $exists: false } }, { isAddon: false }] },
        { category: { $ne: "Add-ons" } },
      ];
    } else if (includeAddons && !includeRegular) {
      // Only include add-ons
      query.$or = [{ isAddon: true }, { category: "Add-ons" }];
    }
    // If both are true or both are false, include all available products

    const list = await Product.find(query).populate("ingredients.ingredient");
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
    // normalize incoming category to UPPERCASE
    if (req.body.category)
      req.body.category = (req.body.category || "").trim().toUpperCase();
    if (req.body.productName)
      req.body.productName = (req.body.productName || "").trim().toUpperCase();

    const {
      productName,
      sizes,
      category,
      status,
      ingredients,
      image,
      isAddon,
    } = req.body;

    // Find existing product
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      if (req.file) {
        await deleteCloudinaryImage(req.file.path);
      }
      return res.status(404).json({ message: "Product not found" });
    }

    // Check for duplicate product name (excluding current product)
    const duplicateProduct = await Product.findOne({
      productName: productName.trim().toUpperCase(),
      _id: { $ne: req.params.id } // Exclude current product from check
    });

    if (duplicateProduct) {
      // Delete uploaded file if validation fails
      if (req.file) {
        await deleteCloudinaryImage(req.file.path);
      }
      return res.status(400).json({
        message: `Product "${productName}" already exists. Please use a different name.`
      });
    }

    // Parse sizes and ingredients
    const parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    const parsedIngredients =
      typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients;

    // Validate that ingredients are provided
    if (!parsedIngredients || parsedIngredients.length === 0) {
      // Delete uploaded file if validation fails
      if (req.file) {
        await deleteCloudinaryImage(req.file.path);
      }
      return res.status(400).json({
        message: "At least one ingredient or material is required"
      });
    }

    const data = {
      productName,
      sizes: parsedSizes,
      category,
      status,
      ingredients: parsedIngredients,
      isAddon: isAddon || false,
    };

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (
        existingProduct.image &&
        existingProduct.image.includes("cloudinary.com")
      ) {
        await deleteCloudinaryImage(existingProduct.image);
      }
      data.image = req.file.path;
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
      `Updated ${data.isAddon ? "add-on" : "product"}: ${updated.productName
      } (${updated.category})`
    );

    res.json(updated);
  } catch (err) {
    // Delete uploaded file if update fails
    if (req.file) {
      await deleteCloudinaryImage(req.file.path);
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
    if (deleted.image && deleted.image.includes("cloudinary.com")) {
      await deleteCloudinaryImage(deleted.image);
    }

    await logActivity(
      req,
      "DELETE_PRODUCT",
      `Deleted ${deleted.isAddon ? "add-on" : "product"}: ${deleted.productName
      } (${deleted.category})`
    );

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ message: err.message });
  }
};

// Add this new function for getting products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const list = await Product.find({ category }).populate(
      "ingredients.ingredient"
    );
    res.json(list);
  } catch (err) {
    console.error("Error getting products by category:", err);
    res.status(500).json({ message: err.message });
  }
};
