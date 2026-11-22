import mongoose from "mongoose";

// Order lines are snapshots: name, size and price are copied at purchase
// time so later catalog edits never rewrite order history.
const itemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    slug: String,
    name: String,
    size: String,
    art: Object,
    unitPriceCents: Number,
    qty: Number,
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    name: String,
    line1: String,
    line2: String,
    city: String,
    province: String,
    postalCode: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [itemSchema], required: true },
    subtotalCents: Number,
    shippingCents: Number,
    taxCents: Number,
    taxRate: Number,
    totalCents: Number,
    shippingAddress: addressSchema,
    status: { type: String, enum: ["paid", "fulfilled", "cancelled"], default: "paid", index: true },
    // demo: placed from a demo account (doesn't consume stock, expires).
    // sample: seeded history so the admin dashboard isn't empty.
    demo: { type: Boolean, default: false },
    sample: { type: Boolean, default: false },
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Order", orderSchema);
