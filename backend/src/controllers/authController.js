import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import { parse } from "../lib/http.js";
import { seedDemoOrders, wipeDemoData } from "../lib/demoSeed.js";

const isProd = process.env.NODE_ENV === "production";

// In prod, frontend (Vercel) and backend (Render) live on different domains,
// so the auth cookie has to be sent cross-site. That requires SameSite=None,
// which browsers only allow when the cookie is also marked Secure (HTTPS).
// Locally, the Vite dev server proxies /api same-origin, so Lax is fine and
// avoids needing HTTPS on localhost.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const DEMO_TTL_MS = 24 * 60 * 60 * 1000;

const credentials = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Admin accounts come from the ADMIN_EMAILS env var (comma separated).
function isAdminEmail(email) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role ?? "customer",
    isDemo: Boolean(user.isDemo),
    expiresAt: user.expiresAt ?? null,
  };
}

export async function signup(req, res) {
  const { email, password } = parse(credentials, req.body);
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "An account with that email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, role: isAdminEmail(email) ? "admin" : "customer" });

  res.cookie("token", signToken(user._id), COOKIE_OPTIONS);
  res.status(201).json(publicUser(user));
}

export async function login(req, res) {
  const { email, password } = parse(credentials.extend({ password: z.string().min(1).max(200) }), req.body);
  const user = await User.findOne({ email, isDemo: { $ne: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  // Lets an existing account become admin by adding it to ADMIN_EMAILS.
  if (user.role !== "admin" && isAdminEmail(email)) {
    user.role = "admin";
    await user.save();
  }

  res.cookie("token", signToken(user._id), COOKIE_OPTIONS);
  res.json(publicUser(user));
}

// One click, no sign-up: a private throwaway customer account with a couple
// of past orders. It can also look around the admin dashboard (read-only).
// TTL indexes delete the account and its orders after 24 hours.
export async function demo(_req, res) {
  const expiresAt = new Date(Date.now() + DEMO_TTL_MS);
  const user = await User.create({
    email: `demo-${crypto.randomUUID().slice(0, 8)}@demo.local`,
    // Random, never shown: the account can't be logged into with a password.
    passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
    isDemo: true,
    expiresAt,
  });
  await seedDemoOrders(user._id, expiresAt);

  const token = jwt.sign({ userId: user._id, demo: true }, process.env.JWT_SECRET, {
    expiresIn: DEMO_TTL_MS / 1000,
  });
  res.cookie("token", token, { ...COOKIE_OPTIONS, maxAge: DEMO_TTL_MS });
  res.status(201).json(publicUser(user));
}

export async function logout(req, res) {
  // Demo accounts are single-use: wipe them on logout instead of waiting
  // for the TTL. A bad or expired token just falls through to clearing it.
  try {
    const payload = jwt.verify(req.cookies?.token ?? "", process.env.JWT_SECRET);
    if (payload.demo) {
      await wipeDemoData(payload.userId);
      await User.deleteOne({ _id: payload.userId, isDemo: true });
    }
  } catch {
    // not logged in, or token invalid: nothing to clean up
  }
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await User.findById(req.userId).select("email role isDemo expiresAt");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
}
