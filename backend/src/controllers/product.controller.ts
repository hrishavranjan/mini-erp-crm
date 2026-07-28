import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

// GET /products?search=&category=&page=&limit=&lowStock=true
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "10")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("products").select("*", { count: "exact" });

  const search = (req.query.search as string) || "";
  if (search.trim()) {
    query = query.or(`product_name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  const category = req.query.category as string;
  if (category) query = query.eq("category", category);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, "Failed to fetch products.", error.message);

  let result = data || [];
  if (req.query.lowStock === "true") {
    result = result.filter((p: any) => p.current_stock <= p.min_stock_alert_qty);
  }

  res.status(200).json({
    success: true,
    data: result,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
});

// GET /products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, "Failed to fetch product.", error.message);
  if (!product) throw new ApiError(404, "Product not found.");

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  res.status(200).json({ success: true, data: { ...product, movements: movements || [] } });
});

// POST /products
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const {
    product_name,
    sku,
    category,
    unit_price,
    current_stock,
    min_stock_alert_qty,
    location,
  } = req.body;

  if (!product_name || !sku) {
    throw new ApiError(400, "product_name and sku are required.");
  }
  if (unit_price !== undefined && Number(unit_price) < 0) {
    throw new ApiError(400, "unit_price cannot be negative.");
  }

  const { data: existingSku } = await supabase
    .from("products")
    .select("id")
    .eq("sku", sku)
    .maybeSingle();
  if (existingSku) throw new ApiError(409, `SKU "${sku}" already exists.`);

  const { data, error } = await supabase
    .from("products")
    .insert({
      product_name,
      sku,
      category: category || null,
      unit_price: unit_price ?? 0,
      current_stock: current_stock ?? 0,
      min_stock_alert_qty: min_stock_alert_qty ?? 0,
      location: location || null,
      created_by: req.user?.id || null,
    })
    .select()
    .single();

  if (error) throw new ApiError(500, "Failed to create product.", error.message);

  // If opening stock was provided, log it as an IN movement
  if (current_stock && Number(current_stock) > 0) {
    await supabase.from("stock_movements").insert({
      product_id: data.id,
      quantity: Number(current_stock),
      movement_type: "IN",
      reason: "Opening stock",
      created_by: req.user?.id || null,
    });
  }

  res.status(201).json({ success: true, message: "Product created.", data });
});

// PUT /products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatable = [
    "product_name",
    "sku",
    "category",
    "unit_price",
    "min_stock_alert_qty",
    "location",
  ];

  const payload: Record<string, unknown> = {};
  for (const key of updatable) {
    if (key in req.body) payload[key] = req.body[key];
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new ApiError(500, "Failed to update product.", error.message);
  if (!data) throw new ApiError(404, "Product not found.");

  res.status(200).json({ success: true, message: "Product updated.", data });
});

// POST /products/:id/stock-movement  { quantity, movement_type: IN|OUT, reason }
export const addStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity, movement_type, reason } = req.body;

  if (!quantity || Number(quantity) <= 0) {
    throw new ApiError(400, "quantity must be a positive number.");
  }
  if (!["IN", "OUT"].includes(movement_type)) {
    throw new ApiError(400, "movement_type must be IN or OUT.");
  }

  const { data: product, error: pError } = await supabase
    .from("products")
    .select("id, current_stock")
    .eq("id", id)
    .maybeSingle();
  if (pError) throw new ApiError(500, "Failed to fetch product.", pError.message);
  if (!product) throw new ApiError(404, "Product not found.");

  const qty = Number(quantity);
  const newStock =
    movement_type === "IN" ? product.current_stock + qty : product.current_stock - qty;

  if (newStock < 0) {
    throw new ApiError(400, "Stock cannot go negative. Insufficient stock for this OUT movement.");
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw new ApiError(500, "Failed to update stock.", updateError.message);

  const { data: movement, error: mError } = await supabase
    .from("stock_movements")
    .insert({
      product_id: id,
      quantity: qty,
      movement_type,
      reason: reason || null,
      created_by: req.user?.id || null,
    })
    .select()
    .single();
  if (mError) throw new ApiError(500, "Failed to log stock movement.", mError.message);

  res.status(201).json({
    success: true,
    message: "Stock movement recorded.",
    data: { movement, current_stock: newStock },
  });
});
