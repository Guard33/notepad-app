import { Router } from "express";
import rateLimit from "express-rate-limit";
import { signup, login, logout, me, demo } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Each demo click creates an account + a handful of notes, so cap it per IP
// to keep the free-tier database from being flooded.
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many demo accounts from this network. Try again in an hour." },
});

router.post("/signup", signup);
router.post("/login", login);
router.post("/demo", demoLimiter, demo);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
