import mongoose from "mongoose";

const ingredientBatchSchema = new mongoose.Schema({
  ingredient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Ingredient", 
    required: true 
  },
  
  // Batch identification
  batchNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Stock information
  originalQuantity: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  currentQuantity: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  unit: { 
    type: String, 
    required: true 
  },
  
  // Dates
  stockInDate: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  
  expirationDate: { 
    type: Date, 
    required: false // CHANGED: Now optional for non-perishable items
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ["active", "expired", "depleted"],
    default: "active"
  },
  
  // Reference to original stock-in record
  stockInRecord: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "StockIn" 
  },
  
  // Snapshot data for historical integrity
  ingredientSnapshot: {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true }
  }
}, { 
  timestamps: true,
  // Add indexes for better query performance
  indexes: [
    { ingredient: 1, status: 1 },
    { expirationDate: 1, status: 1 },
    { stockInDate: 1 },
    { batchNumber: 1 }
  ]
});

// Virtual to check if batch is expired
ingredientBatchSchema.virtual('isExpired').get(function() {
  // If no expiration date, it never expires
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate && this.status === 'active';
});

// Virtual to check if batch is depleted
ingredientBatchSchema.virtual('isDepleted').get(function() {
  return this.currentQuantity <= 0;
});

// Method to deduct quantity (FIFO logic)
ingredientBatchSchema.methods.deductQuantity = function(quantity) {
  if (quantity > this.currentQuantity) {
    throw new Error(`Cannot deduct ${quantity} ${this.unit}. Only ${this.currentQuantity} ${this.unit} available in batch ${this.batchNumber}`);
  }
  
  this.currentQuantity -= quantity;
  
  // Update status if depleted
  if (this.currentQuantity <= 0) {
    this.status = "depleted";
  }
  
  return this.currentQuantity;
};

// Method to check and update expiration status
ingredientBatchSchema.methods.checkExpiration = function() {
  // If no expiration date, it never expires
  if (!this.expirationDate) return false;
  
  if (new Date() > this.expirationDate && this.status === 'active') {
    this.status = 'expired';
    return true; // Indicates it just expired
  }
  return false;
};

// Static method to get active batches for an ingredient (FIFO order)
ingredientBatchSchema.statics.getActiveBatches = function(ingredientId) {
  return this.find({
    ingredient: ingredientId,
    status: 'active',
    currentQuantity: { $gt: 0 }
  }).sort({ stockInDate: 1 }); // FIFO: First In, First Out
};

// Static method to get expired batches
ingredientBatchSchema.statics.getExpiredBatches = function(ingredientId = null) {
  const query = {
    $or: [
      { status: 'expired' },
      { 
        status: 'active',
        expirationDate: { $exists: true, $lt: new Date() }, // Only check expiration if date exists
        currentQuantity: { $gt: 0 }
      }
    ]
  };
  
  if (ingredientId) {
    query.ingredient = ingredientId;
  }
  
  return this.find(query).sort({ expirationDate: 1 });
};

// Pre-save middleware to auto-update status
ingredientBatchSchema.pre('save', function(next) {
  // Check expiration
  this.checkExpiration();
  
  // Check depletion
  if (this.currentQuantity <= 0 && this.status === 'active') {
    this.status = 'depleted';
  }
  
  next();
});

export default mongoose.model("IngredientBatch", ingredientBatchSchema);