// Database domain types

export interface Tenant {
  id: string
  slug: string
  name: string
  domain: string | null
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
  active: boolean
  created_at: Date
  updated_at: Date
}

export interface TenantSettings {
  id: string
  tenant_id: string
  currency: string
  timezone: string
  language: string
  logo: string | null
  primary_color: string
  extensions: string[]
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface User {
  id: string
  tenant_id: string
  email: string
  password_hash: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'CASHIER'
  active: boolean
  created_at: Date
}

export interface Category {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  created_at: Date
}

export interface Product {
  id: string
  tenant_id: string
  category_id: string | null
  brand_id: string | null
  name: string
  description: string | null
  sku: string
  barcode: string | null
  base_price: number
  cost: number | null
  stock: number
  low_stock_alert: number
  track_stock: boolean
  active: boolean
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  email: string | null
  rut: string | null
  phone: string | null
  address: string | null
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface Order {
  id: string
  tenant_id: string
  customer_id: string | null
  order_number: string
  subtotal: number
  tax: number
  discount: number
  total: number
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
  channel: 'POS' | 'WEB' | 'CHATBOT' | 'API'
  payment_method: string | null
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED'
  metadata: Record<string, unknown>
  created_at: Date
  completed_at: Date | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  metadata: Record<string, unknown>
  created_at: Date
}

export interface StockMovement {
  id: string
  tenant_id: string
  product_id: string
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN'
  quantity: number
  previous_stock: number
  new_stock: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: Date
}

export interface Promotion {
  id: string
  tenant_id: string
  name: string
  description: string | null
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y' | 'FREE_SHIPPING'
  value: number
  min_purchase: number | null
  product_ids: string[]
  category_ids: string[]
  active: boolean
  starts_at: Date | null
  ends_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface Brand {
  id: string
  tenant_id: string
  name: string
  slug: string
  logo: string | null
  website: string | null
  active: boolean
  created_at: Date
}

export interface ProductVariant {
  id: string
  product_id: string
  tenant_id: string
  sku: string
  barcode: string | null
  attributes: Record<string, unknown>
  price: number | null
  stock: number
  active: boolean
  created_at: Date
}
