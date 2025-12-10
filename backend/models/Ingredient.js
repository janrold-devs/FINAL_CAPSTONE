import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema({
  name:       { type: String, required: true }, // Removed unique: true
  quantity:   { type: Number, default: 0 },
  unit:       { type: String, required: true }, // grams, ml, pcs
  alert:      { type: Number, default: 10 }, // alert level
  expiration: { type: Date },

  // NEW FIELD
  category: {
    type: String,
    enum: ["Liquid Ingredient", "Solid Ingredient", "Material"],
    required: true
  },

  // Soft delete fields
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }

}, { timestamps: true });

// Compound unique index: name must be unique only among active ingredients
ingredientSchema.index({ name: 1, deleted: 1 }, { 
  unique: true,
  partialFilterExpression: { deleted: { $ne: true } }
});

// Add index for better query performance on deleted items
ingredientSchema.index({ deleted: 1 });

// Add a pre-find middleware to exclude deleted ingredients by default
ingredientSchema.pre(/^find/, function() {
  // Only exclude deleted items if not explicitly querying for them
  if (!this.getQuery().deleted) {
    this.where({ deleted: { $ne: true } });
  }
});

export default mongoose.model("Ingredient", ingredientSchema);
