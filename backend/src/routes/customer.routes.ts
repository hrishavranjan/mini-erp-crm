import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addFollowup,
} from "../controllers/customer.controller";

const router = Router();

router.use(authenticate);

// Admin, sales, and accounts can view customers. Warehouse generally doesn't need CRM access,
// but is allowed read access here in case dispatch needs to confirm customer/address info.
router.get("/", authorize("admin", "sales", "accounts", "warehouse"), listCustomers);
router.get("/:id", authorize("admin", "sales", "accounts", "warehouse"), getCustomer);

// Only admin + sales manage customer records
router.post("/", authorize("admin", "sales"), createCustomer);
router.put("/:id", authorize("admin", "sales"), updateCustomer);
router.post("/:id/followups", authorize("admin", "sales"), addFollowup);

export default router;
