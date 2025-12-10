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
    // Keep reference for active ingredients (for current lookups)
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    
    // Snapshot data to preserve historical records (CRITICAL for data integrity)
    ingredientSnapshot: {
      _id: { type: mongoose.Schema.Types.ObjectId, required: true }, // Original ingredient ID
      name: { type: String, required: true }, // Ingredient name at time of stock-in
      category: { type: String, required: true }, // Category at time of stock-in
      unit: { type: String, required: true } // Unit at time of stock-in
    },
    
    quantity: { type: Number, required: true },
    unit: { type: String } // Unit used for this specific stock-in entry
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("StockIn", stockInSchema);