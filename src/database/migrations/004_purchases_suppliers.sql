-- VentaFácil: Proveedores, Compras & Logs de Operación
-- Migration 004

-- ============================================
-- PROVEEDORES (Suppliers)
-- ============================================
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  rut           VARCHAR(30),
  email         VARCHAR(255),
  phone         VARCHAR(50),
  address       TEXT,
  contact_name  VARCHAR(255),
  notes         TEXT,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id, active);

-- ============================================
-- COMPRAS (Purchases)
-- ============================================
CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number  VARCHAR(100),
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoice_photo   TEXT,
  status          VARCHAR(20) DEFAULT 'COMPLETED'
                    CHECK (status IN ('DRAFT', 'COMPLETED', 'CANCELLED')),
  notes           TEXT,
  purchased_at    TIMESTAMP DEFAULT NOW(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_purchases_tenant   ON purchases(tenant_id, created_at DESC);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);

-- ============================================
-- ITEMS DE COMPRA (Purchase Items)
-- ============================================
CREATE TABLE purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    VARCHAR(255) NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  purchase_price  DECIMAL(12,2) NOT NULL,
  previous_stock  INTEGER NOT NULL DEFAULT 0,
  new_stock       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product  ON purchase_items(product_id);

-- ============================================
-- LOG DE OPERACIONES (Operation Logs)
-- ============================================
CREATE TABLE operation_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name    VARCHAR(255),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    VARCHAR(100),
  detail       JSONB DEFAULT '{}',
  ip_address   VARCHAR(50),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_operation_logs_tenant ON operation_logs(tenant_id, created_at DESC);
CREATE INDEX idx_operation_logs_user   ON operation_logs(user_id);
