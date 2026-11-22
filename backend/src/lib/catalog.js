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

  // Added November 2026. Palettes per style:
  //   waves / bauhaus / contours: [background, ...inks]
  //   sun: [sky top, sky bottom, sun, sea, hills]

  // Bauhaus
  ["Halifax Grid", "Bauhaus", "bauhaus", 61, ["#f4f1de", "#e07a5f", "#3d405b", "#81b29a", "#f2cc8f"], "Terracotta, slate and sage, set out on a strict grid.", [28, 15, 8]],
  ["Modern Harbour", "Bauhaus", "bauhaus", 74, ["#edf2f4", "#2b2d42", "#ef233c", "#8d99ae", "#ffb703"], "Signal red and marigold against harbour greys.", [22, 12, 2]],
  ["Weimar Blue", "Bauhaus", "bauhaus", 88, ["#f1faee", "#1d3557", "#457b9d", "#e63946", "#a8dadc"], "Three blues and one red, the way the school intended.", [26, 9, 6]],
  ["Saltbox", "Bauhaus", "bauhaus", 95, ["#fefae0", "#bc6c25", "#283618", "#dda15e", "#606c38"], "Rust and moss, like painted clapboard after a long winter.", [14, 6, 0]],
  ["Night Shift", "Bauhaus", "bauhaus", 103, ["#1b1b2f", "#e43f5a", "#f4a261", "#2a9d8f", "#e9c46a"], "Bright shapes on a near-black ground, for darker walls.", [18, 3, 5]],

  // Contours
  ["Kejimkujik", "Contours", "contours", 112, ["#f4f3ee", "#8a9a5b", "#5a6b3b", "#2f3e1f", "#d97706"], "Old-growth forest contours with one line of autumn orange.", [21, 11, 6]],
  ["Gros Morne", "Contours", "contours", 127, ["#eae2b7", "#d4a373", "#8d6e4c", "#5c4033", "#003049"], "Tableland ridges in sandstone, with a single deep-blue fjord line.", [17, 8, 2]],
  ["Minas Basin", "Contours", "contours", 139, ["#e9f5f9", "#90c2d9", "#4f8db3", "#1e4f73", "#f77f00"], "Tidal flats drawn in cool blues, one ring catching the sun.", [24, 13, 7]],

  // Sunsets
  ["Lunenburg Red", "Sunsets", "sun", 151, ["#2b2d42", "#ef8354", "#ffd166", "#8d99ae", "#1b1b2f"], "A hot orange evening over the old town waterfront.", [25, 14, 6]],
  ["Cabot Trail Dusk", "Sunsets", "sun", 163, ["#3d405b", "#e07a5f", "#f2cc8f", "#81b29a", "#2b2d42"], "The last light along the highland coast road.", [20, 10, 4]],
  ["Lighthouse Hour", "Sunsets", "sun", 177, ["#03045e", "#0077b6", "#ffb703", "#023e8a", "#011627"], "Deep blue sky, a gold sun, the minute before the lamp comes on.", [30, 16, 9]],
  ["Grand Pré", "Sunsets", "sun", 189, ["#5f0f40", "#fb8b24", "#ffd60a", "#9a031e", "#2d0b1f"], "Plum and ember over the dyked farmland.", [16, 7, 1]],
  ["Salt Marsh", "Sunsets", "sun", 201, ["#606c38", "#dda15e", "#fefae0", "#283618", "#1c2410"], "A pale sun sinking into marsh grass and still water.", [19, 9, 5]],
  ["Mahone Bay", "Sunsets", "sun", 214, ["#22223b", "#c9ada7", "#f2e9e4", "#4a4e69", "#16162a"], "Dusty rose and violet, quiet as the three churches.", [23, 12, 3]],
  ["Hopewell Rocks", "Sunsets", "sun", 226, ["#7f5539", "#ddb892", "#ede0d4", "#9c6644", "#3b2416"], "Sandstone light on the flowerpot rocks at low tide.", [15, 2, 4]],
  ["Indigo Evening", "Sunsets", "sun", 238, ["#10002b", "#5a189a", "#ff9e00", "#3c096c", "#0b0019"], "A violet sky with an orange sun holding on.", [22, 11, 7]],
  ["Cape Split", "Sunsets", "sun", 251, ["#355070", "#eaac8b", "#ffcdb2", "#6d597a", "#1f2d42"], "Peach and slate blue at the end of the long trail.", [18, 8, 0]],

  // Tides
  ["Cobequid Swell", "Tides", "waves", 263, ["#e8f1f2", "#a5c9ca", "#5b8fa8", "#2c5d7c", "#123047"], "Layered swells in five shades of bay water.", [27, 14, 8]],
  ["Sea Glass", "Tides", "waves", 277, ["#0b3c49", "#2e8b80", "#7fc8a9", "#c7e8dd", "#f4f9f4"], "Frosted greens tumbling over a deep teal ground.", [20, 3, 6]],
];

// NFD splits "é" into "e" + a combining accent (U+0300–U+036F), which we drop.
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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

// Called on server start. Adds any catalog poster whose slug isn't in the
// database yet, so a fresh deploy gets the full catalog and posters added
// to CATALOG later appear on the next deploy. Existing products are never
// touched, so stock and price edits made in the admin are kept. Products
// and sample orders are checked separately, so if a deploy is stopped
// halfway through seeding, the next start finishes the job.
export async function seedCatalogIfEmpty() {
  const existing = new Set(await Product.distinct("slug"));
  const missing = catalogProducts().filter((p) => !existing.has(p.slug));
  if (missing.length) {
    await Product.insertMany(missing, { ordered: false });
    console.log(`Added ${missing.length} catalog products`);
  }
  if (process.env.SEED_SAMPLE_ORDERS !== "false" && !(await Order.exists({ sample: true }))) {
    await seedSampleOrders(await Product.find({ active: true }).lean());
    console.log("Seeded sample orders");
  }
}
