-- 008: locations + pos_sessions + alter orders/stock_movements

-- ── Ubicaciones ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'STORE',   -- STORE | WAREHOUSE | ONLINE
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Cada tenant tiene máximo una ubicación default
CREATE UNIQUE INDEX IF NOT EXISTS locations_tenant_default
  ON locations (tenant_id) WHERE is_default = TRUE;

-- ── Sesiones de caja ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  location_id     UUID REFERENCES locations(id),
  user_id         UUID REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'OPEN',   -- OPEN | CLOSED | FORCE_CLOSED
  opening_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount  NUMERIC(12,2),
  closing_notes   TEXT,
  -- snapshot de totales al cierre
  total_sales     NUMERIC(12,2),
  total_cash      NUMERIC(12,2),
  total_card      NUMERIC(12,2),
  total_transfer  NUMERIC(12,2),
  total_cancelled NUMERIC(12,2),
  -- forzado por admin
  force_closed_by   UUID REFERENCES users(id),
  force_closed_note TEXT,
  opened_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Solo 1 sesión OPEN por usuario
CREATE UNIQUE INDEX IF NOT EXISTS pos_sessions_user_open
  ON pos_sessions (user_id) WHERE status = 'OPEN';

-- ── Ampliar orders ────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS location_id     UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS pos_session_id  UUID REFERENCES pos_sessions(id);

-- ── Ampliar stock_movements ───────────────────────────────────────────────────
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- ── Ampliar users ─────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ── Crear ubicación default para tenants existentes ──────────────────────────
INSERT INTO locations (tenant_id, name, type, is_default)
SELECT id, 'Principal', 'STORE', TRUE
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM locations WHERE is_default = TRUE AND tenant_id IS NOT NULL)
ON CONFLICT DO NOTHING;
