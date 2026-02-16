-- Agrega soporte para permiso de medio día en rrhh_requests
ALTER TABLE rrhh_requests
  ADD COLUMN IF NOT EXISTS is_half_day   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS half_day_period VARCHAR(2);  -- 'AM' | 'PM'
