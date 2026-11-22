import mongoose from "mongoose";
import Product from "../models/Product.js";

// Sales tax by province: GST, HST, or GST + PST/QST combined. Shipping is
// taxable in Canada, so tax applies to subtotal + shipping.
export const PROVINCES = {
  AB: { name: "Alberta", rate: 0.05 },
  BC: { name: "British Columbia", rate: 0.12 },
  MB: { name: "Manitoba", rate: 0.12 },
  NB: { name: "New Brunswick", rate: 0.15 },
  NL: { name: "Newfoundland and Labrador", rate: 0.15 },
  NS: { name: "Nova Scotia", rate: 0.14 },
  NT: { name: "Northwest Territories", rate: 0.05 },
  NU: { name: "Nunavut", rate: 0.05 },
  ON: { name: "Ontario", rate: 0.13 },
  PE: { name: "Prince Edward Island", rate: 0.15 },
  QC: { name: "Quebec", rate: 0.14975 },
  SK: { name: "Saskatchewan", rate: 0.11 },
  YT: { name: "Yukon", rate: 0.05 },
};

export const SHIPPING_CENTS = 800;
export const FREE_SHIPPING_FROM_CENTS = 7500;
export const MAX_QTY_PER_LINE = 10;

// Prices a cart entirely from the database. The client only ever sends
// product/variant ids and quantities; any price it might send is ignored.
// Returns priced lines plus a list of problems (sold out, not enough stock).
export async function quote(items, province) {
  // Merge duplicate lines for the same variant.
  const wanted = new Map();
  for (const { productId, variantId, qty } of items) {
    if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId)) continue;
    const key = `${productId}:${variantId}`;
    wanted.set(key, { productId, variantId, qty: (wanted.get(key)?.qty ?? 0) + qty });
  }

  const ids = [...new Set([...wanted.values()].map((w) => w.productId))];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  const problems = [];
  for (const { productId, variantId, qty } of wanted.values()) {
    const product = byId.get(String(productId));
    const variant = product?.variants.find((v) => String(v._id) === String(variantId));
    if (!product || !variant || !product.active) {
      problems.push({ productId, variantId, message: "An item in your cart is no longer available." });
      continue;
    }
    const line = {
      productId: String(product._id),
      variantId: String(variant._id),
      slug: product.slug,
      name: product.name,
      size: variant.size,
      art: product.art,
      unitPriceCents: variant.priceCents,
      qty: Math.min(qty, MAX_QTY_PER_LINE),
      stock: variant.stock,
    };
    line.lineTotalCents = line.unitPriceCents * line.qty;
    if (variant.stock === 0) {
      problems.push({ productId, variantId, message: `${product.name} (${variant.size}) is sold out.` });
    } else if (variant.stock < line.qty) {
      problems.push({ productId, variantId, message: `Only ${variant.stock} left of ${product.name} (${variant.size}).` });
    }
    lines.push(line);
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const shippingCents = subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
  const taxRate = PROVINCES[province]?.rate ?? null;
  const taxCents = taxRate == null ? null : Math.round((subtotalCents + shippingCents) * taxRate);

  return {
    lines,
    problems,
    subtotalCents,
    shippingCents,
    taxRate,
    taxCents,
    totalCents: subtotalCents + shippingCents + (taxCents ?? 0),
    freeShippingFromCents: FREE_SHIPPING_FROM_CENTS,
  };
}
