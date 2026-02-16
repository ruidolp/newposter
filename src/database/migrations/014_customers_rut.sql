-- 014: add RUT to customers and enforce uniqueness by tenant

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS rut VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_rut_unique
  ON customers (tenant_id, rut)
  WHERE rut IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_tenant_rut
  ON customers (tenant_id, rut);
