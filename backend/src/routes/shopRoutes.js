import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { adminRead, adminWrite } from "../middleware/admin.js";
import {
  listProducts,
  listCollections,
  getProduct,
  getShopConfig,
  quoteCart,
  placeOrder,
  myOrders,
  myOrder,
} from "../controllers/shopController.js";
import {
  stats,
  listOrders,
  updateOrderStatus,
  listAllProducts,
  createProduct,
  updateProduct,
} from "../controllers/adminController.js";

const router = Router();

// Public storefront
router.get("/products", listProducts);
router.get("/collections", listCollections);
router.get("/products/:slug", getProduct);
router.get("/config", getShopConfig);
router.post("/cart/quote", quoteCart);

// Customer
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many orders in a short time. Try again in a few minutes." },
});
router.post("/orders", requireAuth, orderLimiter, placeOrder);
router.get("/orders", requireAuth, myOrders);
router.get("/orders/:id", requireAuth, myOrder);

// Admin
const admin = Router();
admin.use(requireAuth, adminRead);
admin.get("/stats", stats);
admin.get("/orders", listOrders);
admin.patch("/orders/:id", adminWrite, updateOrderStatus);
admin.get("/products", listAllProducts);
admin.post("/products", adminWrite, createProduct);
admin.patch("/products/:id", adminWrite, updateProduct);
router.use("/admin", admin);

export default router;
