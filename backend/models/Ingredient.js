import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true },
  quantity:   { type: Number, default: 0 },
  unit:       { type: String, required: true }, // grams, ml, pcs
  alert:      { type: Number, default: 10 }, // alert level
  expiration: { type: Date },

  // NEW FIELD
  category: {
    type: String,
    enum: ["Liquid Ingredient", "Solid Ingredient", "Material"],
    required: true
  }

}, { timestamps: true });

export default mongoose.model("Ingredient", ingredientSchema);
