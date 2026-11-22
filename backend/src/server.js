import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { seedCatalogIfEmpty } from "./lib/catalog.js";
import authRoutes from "./routes/authRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";

const app = express();

// Render sits behind a proxy; trust it so rate limiting sees real client IPs.
app.set("trust proxy", 1);

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api", shopRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Express 5 forwards errors thrown in async handlers here. Client errors
// (our HttpErrors, malformed JSON, oversized bodies) keep their status and
// message; anything else is logged and hidden behind a generic 500.
app.use((err, _req, res, _next) => {
  const status = err.status ?? err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(seedCatalogIfEmpty)
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch((err) => {
    console.error("Failed to start", err);
    process.exit(1);
  });
