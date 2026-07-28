import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const ALLOWED_TYPES = ["Retail", "Wholesale", "Distributor"];
const ALLOWED_STATUS = ["Lead", "Active", "Inactive"];

// GET /customers?search=&status=&type=&page=&limit=
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "10")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("customers").select("*", { count: "exact" });

  const search = (req.query.search as string) || "";
  if (search.trim()) {
    query = query.or(
      `customer_name.ilike.%${search}%,mobile_number.ilike.%${search}%,business_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const status = req.query.status as string;
  if (status && ALLOWED_STATUS.includes(status)) {
    query = query.eq("status", status);
  }

  const type = req.query.type as string;
  if (type && ALLOWED_TYPES.includes(type)) {
    query = query.eq("customer_type", type);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, "Failed to fetch customers.", error.message);

  res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
});

// GET /customers/:id
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(500, "Failed to fetch customer.", error.message);
  if (!customer) throw new ApiError(404, "Customer not found.");

  const { data: followups, error: fError } = await supabase
    .from("customer_followups")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  if (fError) throw new ApiError(500, "Failed to fetch follow-ups.", fError.message);

  res.status(200).json({ success: true, data: { ...customer, followups } });
});

// POST /customers
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const {
    customer_name,
    mobile_number,
    email,
    business_name,
    gst_number,
    customer_type,
    address,
    status,
    follow_up_date,
    notes,
  } = req.body;

  if (!customer_name || !mobile_number) {
    throw new ApiError(400, "customer_name and mobile_number are required.");
  }
  if (customer_type && !ALLOWED_TYPES.includes(customer_type)) {
    throw new ApiError(400, `customer_type must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }
  if (status && !ALLOWED_STATUS.includes(status)) {
    throw new ApiError(400, `status must be one of: ${ALLOWED_STATUS.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      customer_name,
      mobile_number,
      email: email || null,
      business_name: business_name || null,
      gst_number: gst_number || null,
      customer_type: customer_type || "Retail",
      address: address || null,
      status: status || "Lead",
      follow_up_date: follow_up_date || null,
      notes: notes || null,
      created_by: req.user?.id || null,
    })
    .select()
    .single();

  if (error) throw new ApiError(500, "Failed to create customer.", error.message);

  res.status(201).json({ success: true, message: "Customer created.", data });
});

// PUT /customers/:id
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatable = [
    "customer_name",
    "mobile_number",
    "email",
    "business_name",
    "gst_number",
    "customer_type",
    "address",
    "status",
    "follow_up_date",
    "notes",
  ];

  const payload: Record<string, unknown> = {};
  for (const key of updatable) {
    if (key in req.body) payload[key] = req.body[key];
  }

  if (payload.customer_type && !ALLOWED_TYPES.includes(payload.customer_type as string)) {
    throw new ApiError(400, `customer_type must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }
  if (payload.status && !ALLOWED_STATUS.includes(payload.status as string)) {
    throw new ApiError(400, `status must be one of: ${ALLOWED_STATUS.join(", ")}`);
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new ApiError(500, "Failed to update customer.", error.message);
  if (!data) throw new ApiError(404, "Customer not found.");

  res.status(200).json({ success: true, message: "Customer updated.", data });
});

// POST /customers/:id/followups
export const addFollowup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { note, follow_up_date } = req.body;

  if (!note) throw new ApiError(400, "note is required.");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!customer) throw new ApiError(404, "Customer not found.");

  const { data, error } = await supabase
    .from("customer_followups")
    .insert({
      customer_id: id,
      note,
      follow_up_date: follow_up_date || null,
      created_by: req.user?.id || null,
    })
    .select()
    .single();

  if (error) throw new ApiError(500, "Failed to add follow-up.", error.message);

  if (follow_up_date) {
    await supabase.from("customers").update({ follow_up_date }).eq("id", id);
  }

  res.status(201).json({ success: true, message: "Follow-up added.", data });
});
