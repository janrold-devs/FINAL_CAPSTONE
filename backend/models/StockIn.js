import mongoose from "mongoose";

// Helper function to auto-generate batch number
function generateBatchNumber() {
  const datePart = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `BATCH-${datePart}-${randomPart}`;
}

const stockInSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, unique: true, default: generateBatchNumber },
  stockman:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ingredients: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
    quantity:   { type: Number, required: true },
    unit:       { type: String }
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("StockIn", stockInSchema);