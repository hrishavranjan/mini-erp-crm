import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

interface IncomingItem {
  product_id: string;
  quantity: number;
}

async function generateChallanNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("nextval_challan_seq");
  // Fallback if RPC not created: use count-based number
  if (error || data === null || data === undefined) {
    const { count } = await supabase.from("challans").select("*", { count: "exact", head: true });
    const next = (count || 0) + 1;
    return `CH-${String(next).padStart(5, "0")}`;
  }
  return `CH-${String(data).padStart(5, "0")}`;
}

// GET /challans?status=&customerId=&page=&limit=
export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "10")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("challans")
    .select("*, customers(customer_name, mobile_number)", { count: "exact" });

  const status = req.query.status as string;
  if (status) query = query.eq("status", status);

  const customerId = req.query.customerId as string;
  if (customerId) query = query.eq("customer_id", customerId);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, "Failed to fetch challans.", error.message);

  res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
});

// GET /challans/:id
export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: challan, error } = await supabase
    .from("challans")
    .select("*, customers(customer_name, mobile_number, address)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "Failed to fetch challan.", error.message);
  if (!challan) throw new ApiError(404, "Challan not found.");

  const { data: items, error: iError } = await supabase
    .from("challan_items")
    .select("*")
    .eq("challan_id", id);
  if (iError) throw new ApiError(500, "Failed to fetch challan items.", iError.message);

  res.status(200).json({ success: true, data: { ...challan, items } });
});

// POST /challans   { customer_id, items: [{product_id, quantity}], status: "Draft"|"Confirmed" }
export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const { customer_id, items, status } = req.body as {
    customer_id: string;
    items: IncomingItem[];
    status?: "Draft" | "Confirmed";
  };

  if (!customer_id) throw new ApiError(400, "customer_id is required.");
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "At least one product line item is required.");
  }
  const desiredStatus = status === "Confirmed" ? "Confirmed" : "Draft";

  // Validate customer exists
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customer_id)
    .maybeSingle();
  if (!customer) throw new ApiError(404, "Customer not found.");

  // Fetch product snapshots for all items in one go
  const productIds = items.map((i) => i.product_id);
  const { data: products, error: pError } = await supabase
    .from("products")
    .select("id, product_name, sku, unit_price, current_stock")
    .in("id", productIds);
  if (pError) throw new ApiError(500, "Failed to fetch products.", pError.message);

  const productMap = new Map((products || []).map((p) => [p.id, p]));

  // Validate items & build snapshot rows
  let totalQuantity = 0;
  const itemRows: any[] = [];

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw new ApiError(400, `Product not found: ${item.product_id}`);
    }
    const qty = Number(item.quantity);
    if (!qty || qty <= 0) {
      throw new ApiError(400, `Invalid quantity for product "${product.product_name}".`);
    }

    // Business rule: if confirming now, stock must be sufficient (never allow negative stock)
    if (desiredStatus === "Confirmed" && product.current_stock < qty) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.product_name}" (SKU: ${product.sku}). ` +
          `Available: ${product.current_stock}, Requested: ${qty}.`
      );
    }

    totalQuantity += qty;
    itemRows.push({
      product_id: product.id,
      product_name: product.product_name, // snapshot
      sku: product.sku, // snapshot
      unit_price: product.unit_price, // snapshot
      quantity: qty,
      line_total: Number(product.unit_price) * qty,
    });
  }

  const challan_number = await generateChallanNumber();

  const { data: challan, error: cError } = await supabase
    .from("challans")
    .insert({
      challan_number,
      customer_id,
      total_quantity: totalQuantity,
      status: desiredStatus,
      created_by: req.user?.id || null,
    })
    .select()
    .single();
  if (cError) throw new ApiError(500, "Failed to create challan.", cError.message);

  const rowsWithChallanId = itemRows.map((r) => ({ ...r, challan_id: challan.id }));
  const { error: itemsError } = await supabase.from("challan_items").insert(rowsWithChallanId);
  if (itemsError) {
    // rollback challan header if items fail to insert
    await supabase.from("challans").delete().eq("id", challan.id);
    throw new ApiError(500, "Failed to save challan items.", itemsError.message);
  }

  // If confirmed immediately, reduce stock + log movements
  if (desiredStatus === "Confirmed") {
    await reduceStockForChallan(itemRows, req.user?.id, challan_number);
  }

  res.status(201).json({ success: true, message: `Challan ${desiredStatus.toLowerCase()}.`, data: challan });
});

async function reduceStockForChallan(
  itemRows: { product_id: string; quantity: number }[],
  userId: string | undefined,
  challanNumber: string
) {
  for (const item of itemRows) {
    const { data: product } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", item.product_id)
      .maybeSingle();

    if (!product) continue; // shouldn't happen, already validated
    const newStock = product.current_stock - item.quantity;

    if (newStock < 0) {
      throw new ApiError(
        400,
        `Stock became insufficient while confirming challan (concurrent update). Please retry.`
      );
    }

    await supabase
      .from("products")
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", item.product_id);

    await supabase.from("stock_movements").insert({
      product_id: item.product_id,
      quantity: item.quantity,
      movement_type: "OUT",
      reason: `Sales Challan ${challanNumber}`,
      created_by: userId || null,
    });
  }
}

// PATCH /challans/:id/confirm  -> moves Draft -> Confirmed, reduces stock
export const confirmChallan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: challan, error } = await supabase
    .from("challans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "Failed to fetch challan.", error.message);
  if (!challan) throw new ApiError(404, "Challan not found.");
  if (challan.status !== "Draft") {
    throw new ApiError(400, `Only Draft challans can be confirmed. Current status: ${challan.status}.`);
  }

  const { data: items, error: iError } = await supabase
    .from("challan_items")
    .select("*")
    .eq("challan_id", id);
  if (iError) throw new ApiError(500, "Failed to fetch challan items.", iError.message);

  // Re-validate stock at confirm time (stock may have changed since draft was created)
  for (const item of items || []) {
    const { data: product } = await supabase
      .from("products")
      .select("current_stock, product_name, sku")
      .eq("id", item.product_id)
      .maybeSingle();

    if (!product) throw new ApiError(400, `Product no longer exists for item "${item.product_name}".`);
    if (product.current_stock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.product_name}" (SKU: ${product.sku}). ` +
          `Available: ${product.current_stock}, Required: ${item.quantity}.`
      );
    }
  }

  await reduceStockForChallan(items || [], req.user?.id, challan.challan_number);

  const { data: updated, error: uError } = await supabase
    .from("challans")
    .update({ status: "Confirmed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (uError) throw new ApiError(500, "Failed to confirm challan.", uError.message);

  res.status(200).json({ success: true, message: "Challan confirmed. Stock updated.", data: updated });
});

// PATCH /challans/:id/cancel -> Draft or Confirmed -> Cancelled (restores stock if was confirmed)
export const cancelChallan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: challan, error } = await supabase
    .from("challans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "Failed to fetch challan.", error.message);
  if (!challan) throw new ApiError(404, "Challan not found.");
  if (challan.status === "Cancelled") throw new ApiError(400, "Challan is already cancelled.");

  if (challan.status === "Confirmed") {
    // restore stock
    const { data: items } = await supabase.from("challan_items").select("*").eq("challan_id", id);
    for (const item of items || []) {
      const { data: product } = await supabase
        .from("products")
        .select("current_stock")
        .eq("id", item.product_id)
        .maybeSingle();
      if (product) {
        await supabase
          .from("products")
          .update({ current_stock: product.current_stock + item.quantity })
          .eq("id", item.product_id);

        await supabase.from("stock_movements").insert({
          product_id: item.product_id,
          quantity: item.quantity,
          movement_type: "IN",
          reason: `Cancelled Challan ${challan.challan_number}`,
          created_by: req.user?.id || null,
        });
      }
    }
  }

  const { data: updated, error: uError } = await supabase
    .from("challans")
    .update({ status: "Cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (uError) throw new ApiError(500, "Failed to cancel challan.", uError.message);

  res.status(200).json({ success: true, message: "Challan cancelled.", data: updated });
});
