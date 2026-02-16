-- 013: Ensure every tenant has one default location ("Principal")

INSERT INTO locations (tenant_id, name, type, is_default, active)
SELECT t.id, 'Principal', 'STORE', TRUE, TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM locations l
  WHERE l.tenant_id = t.id
    AND l.is_default = TRUE
)
ON CONFLICT DO NOTHING;
