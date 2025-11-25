// backend/models/Transaction.js
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  category: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalCost: { type: Number, required: true },
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
    totalAmount: { type: Number, required: true }, // sum of all itemsSold[].totalCost
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
