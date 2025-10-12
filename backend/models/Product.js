import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  image:       { type: String }, // image URL
  productName: { type: String, required: true },
  size:        { type: Number }, // changed to Number (e.g., 16, 32)
  price:       { type: Number, required: true },
  ingredients: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    quantity:   { type: Number } // how much of that ingredient is used
  }],
  category: { type: String, required: true }, // e.g. milk tea, frappe
  status:   { type: String, enum: ["available", "unavailable"], default: "available" }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
