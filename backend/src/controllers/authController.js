import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
  res.status(201).json({ id: user._id, email: user.email });
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
  res.json({ id: user._id, email: user.email });
}

export async function logout(_req, res) {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await User.findById(req.userId).select("email");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user._id, email: user.email });
}
