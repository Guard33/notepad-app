import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Note from "../models/Note.js";
import { DEMO_NOTES } from "../lib/demoNotes.js";

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

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    isDemo: Boolean(user.isDemo),
    expiresAt: user.expiresAt ?? null,
  };
}

export async function signup(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "Account already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });

  const token = signToken(user._id);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(201).json(publicUser(user));
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(user._id);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json(publicUser(user));
}

// One click, no sign-up: creates a private throwaway account seeded with
// sample notes. Each visitor gets their own, so nobody sees anyone else's
// edits. TTL indexes on User and Note delete it all after 24 hours.
export async function demo(_req, res) {
  const expiresAt = new Date(Date.now() + DEMO_TTL_MS);
  const user = await User.create({
    email: `demo-${crypto.randomUUID().slice(0, 8)}@demo.local`,
    // Random, never shown: the account can't be logged into with a password.
    passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
    isDemo: true,
    expiresAt,
  });

  // Insert one at a time so updatedAt increases down the list, which keeps
  // the sidebar order (newest first) the same as DEMO_NOTES order reversed.
  for (const { trashed, ...note } of DEMO_NOTES) {
    await Note.create({
      ...note,
      userId: user._id,
      deletedAt: trashed ? new Date() : null,
      expiresAt,
    });
  }

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
      await Note.deleteMany({ userId: payload.userId });
      await User.deleteOne({ _id: payload.userId, isDemo: true });
    }
  } catch {
    // not logged in, or token invalid: nothing to clean up
  }
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await User.findById(req.userId).select("email isDemo expiresAt");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
}
