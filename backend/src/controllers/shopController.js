import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { HttpError, parse, isId } from "../lib/http.js";
import { quoteInput, orderInput } from "../lib/schemas.js";
import { quote, PROVINCES, FREE_SHIPPING_FROM_CENTS, SHIPPING_CENTS } from "../lib/pricing.js";
import { orderFromQuote } from "../lib/catalog.js";

// What the storefront needs per product card.
function summary(p) {
  const prices = p.variants.map((v) => v.priceCents);
  const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
  return {
    _id: p._id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    collectionName: p.collectionName,
    art: p.art,
    featured: p.featured,
    fromPriceCents: Math.min(...prices),
    inStock: stock > 0,
    lowStock: stock > 0 && p.variants.some((v) => v.stock > 0 && v.stock <= 3),
  };
}

const SORTS = {
  featured: { featured: -1, createdAt: 1 },
  newest: { createdAt: -1 },
  name: { name: 1 },
};

export async function listProducts(req, res) {
  const { q, collection, sort = "featured" } = req.query;
  const filter = { active: true };
  if (collection) filter.collectionName = String(collection);
  if (q) filter.$text = { $search: String(q) };

  let products = (await Product.find(filter).sort(SORTS[sort] ?? SORTS.featured).lean()).map(summary);
  if (sort === "price-asc") products.sort((a, b) => a.fromPriceCents - b.fromPriceCents);
  if (sort === "price-desc") products.sort((a, b) => b.fromPriceCents - a.fromPriceCents);
  res.json(products);
}

export async function listCollections(_req, res) {
  const rows = await Product.aggregate([
    { $match: { active: true } },
    { $group: { _id: "$collectionName", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json(rows.map((r) => ({ name: r._id, count: r.count })));
}

export async function getProduct(req, res) {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) throw new HttpError(404, "Product not found");
  const related = await Product.find({
    active: true,
    collectionName: product.collectionName,
    _id: { $ne: product._id },
  })
    .limit(3)
    .lean();
  res.json({ product, related: related.map(summary) });
}

// Store-wide settings the checkout UI shows (tax table, shipping rule).
export function getShopConfig(_req, res) {
  res.json({
    provinces: Object.entries(PROVINCES).map(([code, p]) => ({ code, ...p })),
    shippingCents: SHIPPING_CENTS,
    freeShippingFromCents: FREE_SHIPPING_FROM_CENTS,
  });
}

export async function quoteCart(req, res) {
  const { items, province } = parse(quoteInput, req.body);
  res.json(await quote(items, province));
}

// Takes stock for every line, all or nothing. Each decrement is a single
// atomic update that only matches while enough stock remains, so two
// shoppers can never both buy the last poster. If any line fails, the
// lines already taken are put back.
async function reserveStock(lines) {
  const taken = [];
  for (const line of lines) {
    const result = await Product.updateOne(
      { _id: line.productId, active: true, variants: { $elemMatch: { _id: line.variantId, stock: { $gte: line.qty } } } },
      { $inc: { "variants.$.stock": -line.qty } }
    );
    if (result.modifiedCount !== 1) {
      await releaseStock(taken);
      throw new HttpError(409, `${line.name} (${line.size}) just sold out. Your cart has been updated.`);
    }
    taken.push(line);
  }
}

export async function releaseStock(lines) {
  for (const line of lines) {
    await Product.updateOne(
      { _id: line.productId, "variants._id": line.variantId },
      { $inc: { "variants.$.stock": line.qty } }
    );
  }
}

export async function placeOrder(req, res) {
  const { items, shippingAddress } = parse(orderInput, req.body);
  const user = await User.findById(req.userId).select("isDemo").lean();
  if (!user) throw new HttpError(401, "Not authenticated");

  const q = await quote(items, shippingAddress.province);
  if (q.problems.length) throw new HttpError(409, q.problems[0].message);
  if (!q.lines.length) throw new HttpError(400, "Your cart is empty");

  // Demo orders check availability (above) but don't consume real stock,
  // so visitors can't empty the shop for everyone else.
  if (!user.isDemo) await reserveStock(q.lines);

  try {
    const order = await Order.create(
      orderFromQuote(q, {
        userId: req.userId,
        shippingAddress,
        demo: Boolean(user.isDemo),
        ...(req.demoExpiresAt ? { expiresAt: req.demoExpiresAt } : {}),
      })
    );
    res.status(201).json(order);
  } catch (err) {
    if (!user.isDemo) await releaseStock(q.lines);
    throw err;
  }
}

export async function myOrders(req, res) {
  const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(orders);
}

export async function myOrder(req, res) {
  if (!isId(req.params.id)) throw new HttpError(404, "Order not found");
  const order = await Order.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!order) throw new HttpError(404, "Order not found");
  res.json(order);
}
