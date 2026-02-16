-- VentaFácil Initial Schema
-- Core tables for multi-tenant POS + Ecommerce system

-- Tenants (multi-tenancy)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  plan VARCHAR(20) DEFAULT 'FREE' CHECK (plan IN ('FREE', 'BASIC', 'PRO', 'ENTERPRISE')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant Settings
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  currency VARCHAR(10) DEFAULT 'CLP',
  timezone VARCHAR(50) DEFAULT 'America/Santiago',
  language VARCHAR(10) DEFAULT 'es',
  logo TEXT,
  primary_color VARCHAR(7) DEFAULT '#000000',
  extensions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'STAFF' CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CASHIER')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);

-- Products (Core + barcode incluido)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Core fields
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),

  -- Pricing
  base_price DECIMAL(12, 2) NOT NULL,
  cost DECIMAL(12, 2),

  -- Inventory
  stock INTEGER DEFAULT 0,
  low_stock_alert INTEGER DEFAULT 5,
  track_stock BOOLEAN DEFAULT true,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Extension custom fields
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, sku)
);

CREATE INDEX idx_products_tenant_active ON products(tenant_id, active);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category ON products(category_id);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  order_number VARCHAR(50) UNIQUE NOT NULL,

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
  channel VARCHAR(20) DEFAULT 'POS' CHECK (channel IN ('POS', 'WEB', 'CHATBOT', 'API')),

  -- Payment
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED')),

  -- Extension custom fields
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  CONSTRAINT check_total CHECK (total >= 0)
);

CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,

  -- Extension custom fields (modificadores, notas, etc)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Stock Movements (audit trail)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  type VARCHAR(20) CHECK (type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,

  reference_type VARCHAR(50),
  reference_id UUID,

  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id, created_at DESC);

-- Trigger: Update product updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Create stock movement on product stock change
CREATE OR REPLACE FUNCTION create_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock IS DISTINCT FROM NEW.stock AND NEW.track_stock THEN
    INSERT INTO stock_movements (
      tenant_id,
      product_id,
      type,
      quantity,
      previous_stock,
      new_stock,
      reference_type
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'ADJUSTMENT',
      NEW.stock - OLD.stock,
      OLD.stock,
      NEW.stock,
      'manual'
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_stock_changes AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION create_stock_movement();

-- Migration tracking
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO migrations (version, filename) VALUES (1, '001_initial_schema.sql');
