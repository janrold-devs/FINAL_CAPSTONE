// backend/models/Sales.js
import mongoose from "mongoose";

const salesSchema = new mongoose.Schema(
  {
    batchNumber: { type: String, required: true },
    transactionDate: { type: Date, default: Date.now },
    transactions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    totalSales: { type: Number, required: true },
    calculatedTotal: { type: Number },
    lastRecalculated: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Sales", salesSchema);
