// backend/models/Transaction.js
import mongoose from "mongoose";

const addonSchema = new mongoose.Schema({
  addonId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  addonName: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true },
});

const itemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  category: { type: String },
  size: { type: Number },
  subcategory: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  addons: [addonSchema],

  snapshot: {
    productName: { type: String },
    category: { type: String },
    size: { type: Number },
    price: { type: Number },
    basePrice: { type: Number },
    image: { type: String },
    addons: [
      {
        addonId: { type: mongoose.Schema.Types.ObjectId },
        addonName: { type: String },
        price: { type: Number },
        quantity: { type: Number },
      },
    ],
  },
  // Track optional materials that were NOT included with this item (e.g. "Straw", "Tissue")
  missingMaterials: [String],
});

const transactionSchema = new mongoose.Schema(
  {
    transactionDate: { type: Date, default: Date.now },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemsSold: [itemSchema],
    modeOfPayment: {
      type: String,
      enum: ["Cash", "GCash", "Card"],
      required: true,
    },
    referenceNumber: { type: String },
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
