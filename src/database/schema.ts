import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Json = JsonValue;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [K in string]?: JsonValue;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type Numeric = ColumnType<string, number | string, number | string>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Brands {
  active: Generated<boolean | null>;
  created_at: Generated<Timestamp | null>;
  id: Generated<string>;
  logo: string | null;
  name: string;
  slug: string;
  tenant_id: string | null;
  website: string | null;
}

export interface Categories {
  created_at: Generated<Timestamp | null>;
  description: string | null;
  id: Generated<string>;
  name: string;
  slug: string;
  tenant_id: string | null;
}

export interface Customers {
  address: string | null;
  created_at: Generated<Timestamp | null>;
  email: string | null;
  id: Generated<string>;
  metadata: Generated<Json | null>;
  name: string;
  phone: string | null;
  rut: string | null;
  tenant_id: string | null;
  updated_at: Generated<Timestamp | null>;
}

export interface Migrations {
  executed_at: Generated<Timestamp | null>;
  filename: string;
  id: Generated<number>;
  version: number;
}

export interface OrderItems {
  created_at: Generated<Timestamp | null>;
  id: Generated<string>;
  metadata: Generated<Json | null>;
  order_id: string | null;
  product_id: string | null;
  quantity: number;
  subtotal: Numeric;
  unit_price: Numeric;
}

export interface Locations {
  id: Generated<string>;
  tenant_id: string | null;
  name: string;
  type: Generated<string>;       // STORE | WAREHOUSE | ONLINE
  is_default: Generated<boolean>;
  active: Generated<boolean>;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  hours: string | null;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
}

export interface PosSessions {
  id: Generated<string>;
  tenant_id: string | null;
  location_id: string | null;
  user_id: string | null;
  status: Generated<string>;     // OPEN | CLOSED | FORCE_CLOSED
  opening_amount: Generated<Numeric>;
  closing_amount: Numeric | null;
  closing_notes: string | null;
  total_sales: Numeric | null;
  total_cash: Numeric | null;
  total_card: Numeric | null;
  total_transfer: Numeric | null;
  total_cancelled: Numeric | null;
  force_closed_by: string | null;
  force_closed_note: string | null;
  opened_at: Generated<Timestamp>;
  closed_at: Timestamp | null;
  created_at: Generated<Timestamp | null>;
}

export interface Orders {
  channel: Generated<string | null>;
  completed_at: Timestamp | null;
  created_at: Generated<Timestamp | null>;
  customer_id: string | null;
  discount: Generated<Numeric | null>;
  id: Generated<string>;
  location_id: string | null;
  metadata: Generated<Json | null>;
  order_number: string;
  payment_method: string | null;
  payment_status: Generated<string | null>;
  pos_session_id: string | null;
  status: Generated<string | null>;
  subtotal: Numeric;
  tax: Generated<Numeric | null>;
  tenant_id: string | null;
  total: Numeric;
}

export interface Products {
  active: Generated<boolean | null>;
  barcode: string | null;
  base_price: Numeric;
  brand_id: string | null;
  category_id: string | null;
  cost: Numeric | null;
  created_at: Generated<Timestamp | null>;
  description: string | null;
  id: Generated<string>;
  low_stock_alert: Generated<number | null>;
  metadata: Generated<Json | null>;
  name: string;
  sku: string;
  stock: Generated<number | null>;
  tenant_id: string | null;
  track_stock: Generated<boolean | null>;
  updated_at: Generated<Timestamp | null>;
}

export interface ProductVariants {
  active: Generated<boolean | null>;
  attributes: Json;
  barcode: string | null;
  created_at: Generated<Timestamp | null>;
  id: Generated<string>;
  price: Numeric | null;
  product_id: string | null;
  sku: string;
  stock: Generated<number | null>;
  tenant_id: string | null;
}

export interface Promotions {
  active: Generated<boolean | null>;
  category_ids: Generated<Json | null>;
  created_at: Generated<Timestamp | null>;
  description: string | null;
  ends_at: Timestamp | null;
  id: Generated<string>;
  min_purchase: Numeric | null;
  name: string;
  product_ids: Generated<Json | null>;
  starts_at: Timestamp | null;
  tenant_id: string | null;
  type: string | null;
  updated_at: Generated<Timestamp | null>;
  value: Numeric;
}

export interface StockMovements {
  created_at: Generated<Timestamp | null>;
  created_by: string | null;
  id: Generated<string>;
  location_id: string | null;
  new_stock: number;
  notes: string | null;
  previous_stock: number;
  product_id: string | null;
  quantity: number;
  reference_id: string | null;
  reference_type: string | null;
  tenant_id: string | null;
  type: string | null;
}

export interface Tenants {
  active: Generated<boolean | null>;
  created_at: Generated<Timestamp | null>;
  domain: string | null;
  id: Generated<string>;
  name: string;
  plan: Generated<string | null>;
  slug: string;
  updated_at: Generated<Timestamp | null>;
}

export interface TenantSettings {
  created_at: Generated<Timestamp | null>;
  currency: Generated<string | null>;
  extensions: Generated<Json | null>;
  id: Generated<string>;
  language: Generated<string | null>;
  logo: string | null;
  metadata: Generated<Json | null>;
  primary_color: Generated<string | null>;
  tenant_id: string | null;
  timezone: Generated<string | null>;
  updated_at: Generated<Timestamp | null>;
}

export interface Users {
  active: Generated<boolean | null>;
  created_at: Generated<Timestamp | null>;
  email: string;
  id: Generated<string>;
  metadata: Generated<Json | null>;
  name: string;
  password_hash: string;
  role: Generated<string | null>;
  tenant_id: string | null;
}

export interface Suppliers {
  id: Generated<string>;
  tenant_id: string | null;
  name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_name: string | null;
  notes: string | null;
  active: Generated<boolean | null>;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
}

export interface Purchases {
  id: Generated<string>;
  tenant_id: string | null;
  supplier_id: string | null;
  invoice_number: string | null;
  total_amount: Numeric;
  invoice_photo: string | null;
  status: Generated<string | null>;
  notes: string | null;
  purchased_at: Generated<Timestamp | null>;
  created_by: string | null;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
}

export interface PurchaseItems {
  id: Generated<string>;
  purchase_id: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  purchase_price: Numeric;
  previous_stock: Generated<number>;
  new_stock: Generated<number>;
  created_at: Generated<Timestamp | null>;
}

export interface OperationLogs {
  id: Generated<string>;
  tenant_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: Generated<Json | null>;
  ip_address: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface ProductCostHistory {
  id: Generated<string>;
  tenant_id: string | null;
  product_id: string | null;
  source: string;
  previous_cost: Numeric | null;
  new_cost: Numeric;
  currency: Generated<string>;
  purchase_id: string | null;
  purchase_item_id: string | null;
  supplier_id: string | null;
  invoice_number: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface ProductPriceHistory {
  id: Generated<string>;
  tenant_id: string | null;
  product_id: string | null;
  source: string;
  previous_price: Numeric | null;
  new_price: Numeric;
  currency: Generated<string>;
  purchase_id: string | null;
  purchase_item_id: string | null;
  supplier_id: string | null;
  invoice_number: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface Superadmins {
  id: Generated<string>;
  email: string;
  password_hash: string;
  name: string;
  created_at: Generated<Timestamp | null>;
}

export interface DB {
  locations: Locations;
  pos_sessions: PosSessions;
  superadmins: Superadmins;
  brands: Brands;
  categories: Categories;
  customers: Customers;
  migrations: Migrations;
  operation_logs: OperationLogs;
  order_items: OrderItems;
  orders: Orders;
  product_cost_history: ProductCostHistory;
  product_price_history: ProductPriceHistory;
  product_variants: ProductVariants;
  products: Products;
  promotions: Promotions;
  purchase_items: PurchaseItems;
  purchases: Purchases;
  stock_movements: StockMovements;
  suppliers: Suppliers;
  tenant_settings: TenantSettings;
  tenants: Tenants;
  users: Users;
}
