// backend/models/StockIn.js
import mongoose from "mongoose";

// Helper function to generate date part of batch number
// Helper function to generate date part of batch number
function getDatePart() {
  const now = new Date();

  // Use Intl.DateTimeFormat to get the date in Manila timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  });

  // Format parts (it returns MM/DD/YY in en-US)
  const parts = formatter.formatToParts(now);

  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const year = parts.find(p => p.type === 'year').value;

  return `${month}/${day}/${year}`;
}

// Helper function to auto-generate unique batch number with sequential numbering
// Format: BATCH-MM/DD/YY-N (e.g., BATCH-01/02/26-1, BATCH-01/02/26-2, etc.)
async function generateBatchNumber() {
  const datePart = getDatePart();
  const batchPrefix = `BATCH-${datePart}-`;

  // Find existing batch numbers for today
  const StockIn = mongoose.model('StockIn');
  const existingBatches = await StockIn.find({
    batchNumber: { $regex: `^${batchPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
  }).select('batchNumber').lean();

  // Extract sequence numbers and find the highest
  let maxSequence = 0;
  for (const batch of existingBatches) {
    const sequencePart = batch.batchNumber.replace(batchPrefix, '');
    const sequenceNum = parseInt(sequencePart, 10);
    if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
      maxSequence = sequenceNum;
    }
  }

  // Return next sequence number
  const nextSequence = maxSequence + 1;
  return `${batchPrefix}${nextSequence}`;
}

// Synchronous fallback for schema default (will be overridden in controller)
function generateBatchNumberSync() {
  const datePart = getDatePart();
  return `BATCH-${datePart}-1`;
}

const stockInSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true,
    unique: true,
    default: generateBatchNumberSync // Use sync version for schema default
  },
  stockman: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ingredients: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    ingredientSnapshot: {
      _id: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      category: { type: String, required: true },
      unit: { type: String, required: true }
    },
    quantity: { type: Number, required: true },
    unit: { type: String },
    expirationDate: { type: Date, required: false }, // CHANGED: Now optional
    individualBatchNumber: { type: String },
    createdBatch: { type: mongoose.Schema.Types.ObjectId, ref: "IngredientBatch" }
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// Export the model and helper functions
const StockIn = mongoose.model("StockIn", stockInSchema);
StockIn.generateBatchNumber = generateBatchNumber;
StockIn.getDatePart = getDatePart;

export default StockIn;