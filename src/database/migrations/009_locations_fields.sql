-- 009: add address/contact fields to locations (sucursales)

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS notes       TEXT,
  ADD COLUMN IF NOT EXISTS hours       TEXT;   -- free text for now, eg "Lun-Vie 9:00-18:00"
