import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { quote } from "./pricing.js";

// Starter catalog: 12 generative posters in 4 collections. Stock levels are
// deliberately mixed so low-stock and sold-out states show up in the UI.
const PRICES = { A4: 2400, A3: 3800, A2: 5800 };

const CATALOG = [
  // Tides: stacked waves
  ["North Atlantic", "Tides", "waves", 11, ["#0b2545", "#13315c", "#134074", "#8da9c4", "#eef4ed"], "Cold water, deep blues, and the long swell off the coast.", [40, 25, 12], true],
  ["Peggy's Cove", "Tides", "waves", 27, ["#f4f1de", "#3d5a80", "#98c1d9", "#e0fbfc", "#ee6c4d"], "Bright granite mornings with a lighthouse-red accent.", [18, 3, 6]],
  ["Low Tide", "Tides", "waves", 42, ["#fefae0", "#dda15e", "#bc6c25", "#606c38", "#283618"], "Warm sand and kelp tones from the mud flats at dusk.", [22, 14, 0]],
  // Bauhaus: grid of shapes
  ["Dessau", "Bauhaus", "bauhaus", 7, ["#f2e8cf", "#e63946", "#1d3557", "#f4a261", "#2a9d8f"], "A grid of arcs and blocks in classic modernist colours.", [30, 20, 10], true],
  ["Primary School", "Bauhaus", "bauhaus", 19, ["#fdf6e3", "#d62828", "#003049", "#fcbf49", "#111111"], "Red, blue, yellow, black. Nothing else needed.", [12, 2, 5]],
  ["Kitchen Party", "Bauhaus", "bauhaus", 33, ["#fff3e2", "#ff6b6b", "#4ecdc4", "#1a535c", "#ffe66d"], "Loud, warm and slightly chaotic, like the best ones are.", [0, 0, 0]],
  // Sunsets: sun over water
  ["Point Pleasant", "Sunsets", "sun", 5, ["#ffcdb2", "#ffb4a2", "#e5989b", "#b5838d", "#6d6875"], "Soft pinks over the harbour mouth as the light goes.", [26, 16, 9], true],
  ["Last Ferry", "Sunsets", "sun", 14, ["#14213d", "#fca311", "#e5e5e5", "#243b6b", "#000000"], "A low orange sun behind the 11 pm crossing.", [15, 9, 4]],
  ["Fog Lifts", "Sunsets", "sun", 23, ["#e9ecef", "#ced4da", "#f8f9fa", "#6c757d", "#343a40"], "Greyscale morning, the sun just burning through.", [20, 11, 1]],
  // Contours: topographic lines
  ["Cape Breton Highlands", "Contours", "contours", 3, ["#f1faee", "#a8dadc", "#457b9d", "#1d3557", "#e63946"], "Contour lines in the style of an old survey map.", [24, 13, 7], true],
  ["Sable Island", "Contours", "contours", 31, ["#fbf8f3", "#c9ada7", "#9a8c98", "#4a4e69", "#22223b"], "Shifting dunes, drawn as rings of muted violet.", [16, 4, 8]],
  ["Bay of Fundy", "Contours", "contours", 47, ["#0d1b2a", "#1b263b", "#415a77", "#778da9", "#e0e1dd"], "The world's biggest tides, mapped in midnight blue.", [19, 10, 3]],
];

const slugify = (s) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const catalogProducts = () =>
  CATALOG.map(([name, collectionName, style, seed, palette, tagline, stock, featured = false]) => ({
    slug: slugify(name),
    name,
    collectionName,
    tagline,
    description:
      `${tagline} Generated from code, then printed on 200 gsm matte archival paper with pigment inks. ` +
      "Ships rolled in a recycled tube. Frame not included.",
    art: { style, seed, palette },
    variants: ["A4", "A3", "A2"].map((size, i) => ({ size, priceCents: PRICES[size], stock: stock[i] })),
    featured,
  }));

export function orderNumber() {
  // 6 characters from an alphabet without look-alikes (0/O, 1/I).
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(6);
  return "TW-" + [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

// Builds a finished order document from a priced quote.
export function orderFromQuote(q, extra) {
  return {
    number: orderNumber(),
    items: q.lines.map(({ productId, variantId, slug, name, size, art, unitPriceCents, qty }) => ({
      productId, variantId, slug, name, size, art, unitPriceCents, qty,
    })),
    subtotalCents: q.subtotalCents,
    shippingCents: q.shippingCents,
    taxRate: q.taxRate,
    taxCents: q.taxCents,
    totalCents: q.totalCents,
    ...extra,
  };
}

const SAMPLE_ADDRESSES = [
  { name: "Sample Customer", line1: "1 Sample St", city: "Halifax", province: "NS", postalCode: "B3H 1A1" },
  { name: "Sample Customer", line1: "2 Sample Ave", city: "Toronto", province: "ON", postalCode: "M5V 2T6" },
  { name: "Sample Customer", line1: "3 Sample Rd", city: "Vancouver", province: "BC", postalCode: "V6B 1A1" },
  { name: "Sample Customer", line1: "4 Sample Blvd", city: "Montréal", province: "QC", postalCode: "H2X 1Y4" },
];

// Seeded order history so the admin dashboard has something to show on a
// fresh database. Every one is flagged `sample` and labelled in the UI.
async function seedSampleOrders(products) {
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const customer = await User.findOneAndUpdate(
    { email: "sample-customer@tidewater.local" },
    { $setOnInsert: { passwordHash } },
    { upsert: true, new: true }
  );
  // Deterministic pseudo-random so every fresh database looks the same.
  let s = 12345;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const orders = [];
  for (let i = 0; i < 34; i++) {
    const daysAgo = Math.floor(rand() * 21);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rand() * 86400000));
    const picks = 1 + Math.floor(rand() * 3);
    const items = [];
    for (let j = 0; j < picks; j++) {
      const p = products[Math.floor(rand() * products.length)];
      const v = p.variants[Math.floor(rand() * p.variants.length)];
      items.push({ productId: String(p._id), variantId: String(v._id), qty: 1 + Math.floor(rand() * 2) });
    }
    const address = SAMPLE_ADDRESSES[i % SAMPLE_ADDRESSES.length];
    const q = await quote(items, address.province);
    orders.push({
      ...orderFromQuote(q, { userId: customer._id, shippingAddress: address, sample: true }),
      status: daysAgo > 3 ? "fulfilled" : "paid",
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Order.insertMany(orders, { timestamps: false });
}

// Called on server start: fills an empty database so a fresh deploy (or a
// teammate's local setup) works with no manual seeding step.
export async function seedCatalogIfEmpty() {
  if (await Product.estimatedDocumentCount()) return;
  const products = await Product.insertMany(catalogProducts());
  if (process.env.SEED_SAMPLE_ORDERS !== "false") await seedSampleOrders(products);
  console.log(`Seeded ${products.length} products`);
}
