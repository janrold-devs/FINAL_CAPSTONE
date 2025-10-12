import mongoose from "mongoose";

const spoilageSchema = new mongoose.Schema({
  personInCharge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ingredients: [
    {
      ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient", required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
    },
  ],
  totalWaste: { type: Number, required: true },
  remarks: { type: String },
}, { timestamps: true });

export default mongoose.model("Spoilage", spoilageSchema);
