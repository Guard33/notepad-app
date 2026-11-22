import mongoose from "mongoose";

// A purchasable size of a poster. Price and stock live per variant.
const variantSchema = new mongoose.Schema({
  size: { type: String, required: true }, // "A4", "A3", "A2"
  priceCents: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
});

// Posters are generated artwork, so a product stores the recipe (style,
// seed, palette) rather than an image file. The client renders it as SVG.
const artSchema = new mongoose.Schema(
  {
    style: { type: String, enum: ["waves", "bauhaus", "sun", "contours"], required: true },
    seed: { type: Number, required: true },
    palette: { type: [String], required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    collectionName: { type: String, required: true, trim: true },
    art: { type: artSchema, required: true },
    variants: { type: [variantSchema], default: [] },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", collectionName: "text" });
productSchema.index({ active: 1, collectionName: 1 });

export default mongoose.model("Product", productSchema);
