import mongoose from "mongoose";

const spoilageSchema = new mongoose.Schema({
  personInCharge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ingredients: [
    {
      // Keep reference for active ingredients (for current lookups)
      ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
      
      // Snapshot data to preserve historical records (CRITICAL for data integrity)
      ingredientSnapshot: {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true }, // Original ingredient ID
        name: { type: String, required: true }, // Ingredient name at time of spoilage
        category: { type: String, required: true }, // Category at time of spoilage
        unit: { type: String, required: true } // Unit at time of spoilage
      },
      
      quantity: { type: Number, required: true },
      unit: { type: String, required: true }, // Unit used for this specific spoilage entry
    },
  ],
  totalWaste: { type: Number, required: true },
  remarks: { type: String },
}, { timestamps: true });

export default mongoose.model("Spoilage", spoilageSchema);
