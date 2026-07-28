import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  listChallans,
  getChallan,
  createChallan,
  confirmChallan,
  cancelChallan,
} from "../controllers/challan.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("admin", "sales", "warehouse", "accounts"), listChallans);
router.get("/:id", authorize("admin", "sales", "warehouse", "accounts"), getChallan);

// Sales creates challans (draft or confirmed)
router.post("/", authorize("admin", "sales"), createChallan);

// Confirm can be done by sales or warehouse (dispatch confirms stock went out)
router.patch("/:id/confirm", authorize("admin", "sales", "warehouse"), confirmChallan);
router.patch("/:id/cancel", authorize("admin", "sales"), cancelChallan);

export default router;
