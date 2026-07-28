export type UserRole = "admin" | "sales" | "warehouse" | "accounts";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  customer_name: string;
  mobile_number: string;
  email: string | null;
  business_name: string | null;
  gst_number: string | null;
  customer_type: "Retail" | "Wholesale" | "Distributor";
  address: string | null;
  status: "Lead" | "Active" | "Inactive";
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  followups?: Followup[];
}

export interface Followup {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  product_name: string;
  sku: string;
  category: string | null;
  unit_price: number;
  current_stock: number;
  min_stock_alert_qty: number;
  location: string | null;
  created_at: string;
  movements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: "IN" | "OUT";
  reason: string | null;
  created_at: string;
}

export interface ChallanItem {
  id?: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Challan {
  id: string;
  challan_number: string;
  customer_id: string;
  customers?: { customer_name: string; mobile_number: string; address?: string };
  total_quantity: number;
  status: "Draft" | "Confirmed" | "Cancelled";
  created_at: string;
  items?: ChallanItem[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
