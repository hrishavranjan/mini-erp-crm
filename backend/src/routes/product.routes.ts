import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  addStockMovement,
} from "../controllers/product.controller";

const router = Router();

router.use(authenticate);

// Everyone logged in can view products (sales needs it to create challans)
router.get("/", listProducts);
router.get("/:id", getProduct);

// Admin + warehouse manage products & stock
router.post("/", authorize("admin", "warehouse"), createProduct);
router.put("/:id", authorize("admin", "warehouse"), updateProduct);
router.post("/:id/stock-movement", authorize("admin", "warehouse"), addStockMovement);

export default router;
