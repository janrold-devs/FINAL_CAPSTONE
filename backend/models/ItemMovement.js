import mongoose from "mongoose";

// Helper function to auto-generate batch number
function generateBatchNumber() {
  const datePart = new Date().toISOString().split("T")[0].replace(/-/g, ""); // e.g. 20251009
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `BATCH-${datePart}-${randomPart}`;
}

const itemMovementSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },

    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be greater than zero"],
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      default: "N/A", // optional, only applies for transfers
      trim: true,
    },

    actionType: {
      type: String,
      enum: ["Used", "Transfer"],
      required: true,
    },

    batchNumber: {
      type: String,
      unique: true,
      default: generateBatchNumber,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ItemMovement", itemMovementSchema);
