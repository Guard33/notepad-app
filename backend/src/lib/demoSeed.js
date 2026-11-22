import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { quote } from "./pricing.js";
import { orderFromQuote } from "./catalog.js";

// Gives a new demo account two past orders, so "My orders" isn't empty.
// Demo orders never touch real stock and expire with the account.
export async function seedDemoOrders(userId, expiresAt) {
  const products = await Product.find({ active: true, featured: true }).limit(3).lean();
  if (products.length < 2) return;
  const address = {
    name: "Demo Visitor",
    line1: "1 Demo Street",
    line2: "",
    city: "Halifax",
    province: "NS",
    postalCode: "B3H 1A1",
  };
  const baskets = [
    { daysAgo: 9, status: "fulfilled", items: [[products[0], 1, 1], [products[1], 0, 2]] },
    { daysAgo: 1, status: "paid", items: [[products[products.length - 1], 2, 1]] },
  ];
  for (const { daysAgo, status, items } of baskets) {
    const q = await quote(
      items.map(([p, v, qty]) => ({ productId: String(p._id), variantId: String(p.variants[v]._id), qty })),
      address.province
    );
    const createdAt = new Date(Date.now() - daysAgo * 86400000);
    await Order.create(
      [{ ...orderFromQuote(q, { userId, shippingAddress: address, demo: true, expiresAt }), status, createdAt, updatedAt: createdAt }],
      { timestamps: false }
    );
  }
}

export async function wipeDemoData(userId) {
  await Order.deleteMany({ userId, demo: true });
}
