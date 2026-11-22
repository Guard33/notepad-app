import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { HttpError, parse, isId } from "../lib/http.js";
import { productCreate, productUpdate, orderStatusInput } from "../lib/schemas.js";
import { releaseStock } from "./shopController.js";

const DAY = 86400000;
const TZ = "America/Halifax";

// Dashboard numbers. Cancelled orders don't count toward revenue.
export async function stats(_req, res) {
  const since30 = new Date(Date.now() - 30 * DAY);
  const since14 = new Date(Date.now() - 13 * DAY);
  since14.setHours(0, 0, 0, 0);
  const counted = { status: { $ne: "cancelled" } };

  const [totals, daily, topProducts, lowStock, recent, open] = await Promise.all([
    Order.aggregate([
      { $match: { ...counted, createdAt: { $gte: since30 } } },
      {
        $group: {
          _id: null,
          revenueCents: { $sum: "$totalCents" },
          orders: { $sum: 1 },
          units: { $sum: { $sum: "$items.qty" } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { ...counted, createdAt: { $gte: since14 } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          revenueCents: { $sum: "$totalCents" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { ...counted, createdAt: { $gte: since30 } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          art: { $first: "$items.art" },
          units: { $sum: "$items.qty" },
          revenueCents: { $sum: { $multiply: ["$items.qty", "$items.unitPriceCents"] } },
        },
      },
      { $sort: { revenueCents: -1 } },
      { $limit: 5 },
    ]),
    Product.aggregate([
      { $match: { active: true } },
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lte: 3 } } },
      { $project: { name: 1, slug: 1, size: "$variants.size", stock: "$variants.stock" } },
      { $sort: { stock: 1, name: 1 } },
      { $limit: 8 },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(6).populate("userId", "email").lean(),
    Order.countDocuments({ status: "paid" }),
  ]);

  // One entry per day for the last 14 days, zero-filled.
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.now() - i * DAY).toLocaleDateString("en-CA", { timeZone: TZ });
    days.push({ date: key, revenueCents: byDay.get(key)?.revenueCents ?? 0, orders: byDay.get(key)?.orders ?? 0 });
  }

  const t = totals[0] ?? { revenueCents: 0, orders: 0, units: 0 };
  res.json({
    last30: { ...t, averageOrderCents: t.orders ? Math.round(t.revenueCents / t.orders) : 0 },
    toFulfil: open,
    days,
    topProducts,
    lowStock,
    recent,
  });
}

export async function listOrders(req, res) {
  const filter = {};
  if (["paid", "fulfilled", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).populate("userId", "email").lean();
  res.json(orders);
}

// paid → fulfilled, or paid → cancelled (which puts the stock back).
export async function updateOrderStatus(req, res) {
  const { status } = parse(orderStatusInput, req.body);
  if (!isId(req.params.id)) throw new HttpError(404, "Order not found");
  const order = await Order.findById(req.params.id);
  if (!order) throw new HttpError(404, "Order not found");
  if (order.status !== "paid") throw new HttpError(409, `This order is already ${order.status}`);

  if (status === "cancelled" && !order.demo && !order.sample) await releaseStock(order.items);
  order.status = status;
  await order.save();
  res.json(order);
}

export async function listAllProducts(_req, res) {
  res.json(await Product.find().sort({ collectionName: 1, name: 1 }).lean());
}

const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function createProduct(req, res) {
  const input = parse(productCreate, req.body);
  let slug = slugify(input.name) || "poster";
  for (let n = 2; await Product.exists({ slug }); n++) slug = `${slugify(input.name)}-${n}`;
  const product = await Product.create({ ...input, slug });
  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  if (!isId(req.params.id)) throw new HttpError(404, "Product not found");
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, "Product not found");
  const changes = parse(productUpdate, req.body);
  // Keep variant ids stable so carts and order history keep pointing at them.
  if (changes.variants) {
    changes.variants = changes.variants.map((v) => {
      const existing = product.variants.find((e) => String(e._id) === v._id || e.size === v.size);
      return existing ? { ...v, _id: existing._id } : v;
    });
  }
  Object.assign(product, changes);
  await product.save();
  res.json(product);
}
