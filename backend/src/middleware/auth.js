import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    // Demo sessions carry their expiry in the token, so anything the visitor
    // creates can be stamped to expire alongside the account.
    if (payload.demo) req.demoExpiresAt = new Date(payload.exp * 1000);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
