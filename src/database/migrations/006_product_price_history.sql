-- VentaFácil: Historial de precios de venta de productos
-- Migration 006

CREATE TABLE product_price_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE CASCADE,
  source            VARCHAR(20) NOT NULL
                    CHECK (source IN ('PURCHASE', 'MANUAL', 'SYSTEM')),
  previous_price    DECIMAL(12,2),
  new_price         DECIMAL(12,2) NOT NULL,
  currency          VARCHAR(10) NOT NULL DEFAULT 'CLP',
  purchase_id       UUID REFERENCES purchases(id) ON DELETE SET NULL,
  purchase_item_id  UUID REFERENCES purchase_items(id) ON DELETE SET NULL,
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number    VARCHAR(100),
  reason            TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_price_history_product
  ON product_price_history(product_id, created_at DESC);
CREATE INDEX idx_product_price_history_tenant
  ON product_price_history(tenant_id, created_at DESC);
CREATE INDEX idx_product_price_history_purchase
  ON product_price_history(purchase_id);
