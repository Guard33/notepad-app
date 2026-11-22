import { z } from "zod";
import { PROVINCES, MAX_QTY_PER_LINE } from "./pricing.js";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "invalid id");

const cartItem = z.object({
  productId: id,
  variantId: id,
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});

export const quoteInput = z.object({
  items: z.array(cartItem).max(50),
  province: z.enum(Object.keys(PROVINCES)).optional(),
});

export const orderInput = z.object({
  items: z.array(cartItem).min(1, "Your cart is empty").max(50),
  shippingAddress: z.object({
    name: z.string().trim().min(1).max(100),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).default(""),
    city: z.string().trim().min(1).max(100),
    province: z.enum(Object.keys(PROVINCES)),
    // Canadian postal code, e.g. B3H 4R2 (space optional).
    postalCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/, "Enter a valid Canadian postal code"),
  }),
});

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "colors must be #rrggbb");

const variantInput = z.object({
  _id: id.optional(),
  size: z.enum(["A4", "A3", "A2"]),
  priceCents: z.number().int().min(100).max(100000),
  stock: z.number().int().min(0).max(10000),
});

export const productCreate = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(120).default(""),
  description: z.string().trim().max(2000).default(""),
  collectionName: z.string().trim().min(1).max(40),
  art: z.object({
    style: z.enum(["waves", "bauhaus", "sun", "contours"]),
    seed: z.number().int().min(0).max(2 ** 31),
    palette: z.array(hex).min(3).max(6),
  }),
  variants: z
    .array(variantInput)
    .min(1)
    .max(3)
    .refine((v) => new Set(v.map((x) => x.size)).size === v.length, "each size can only appear once"),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const productUpdate = productCreate.partial();

export const orderStatusInput = z.object({
  status: z.enum(["fulfilled", "cancelled"]),
});
