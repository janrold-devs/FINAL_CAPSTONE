import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    image: { type: String },
    productName: { type: String, required: true },
    sizes: [
      {
        size: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    ingredients: [
      {
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
        quantity: { type: Number },
        quantities: [
          {
            size: { type: Number }, // e.g., 16
            quantity: { type: Number }, // e.g., 10
          },
        ],
      },
    ],
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
    },
    isAddon: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
