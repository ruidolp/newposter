-- Migration 007: Superadmins table
-- Tabla exclusiva para administradores de la plataforma (nosotros).
-- Completamente separada de tenants y users.

CREATE TABLE IF NOT EXISTS superadmins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Insertar superadmin inicial.
-- Contraseña: superadmin123  (cambiar en producción via UPDATE)
-- Hash generado con bcrypt rounds=10
INSERT INTO superadmins (email, password_hash, name) VALUES (
  'root@ventafacil.app',
  '$2a$10$LOsbQ0gpC/STuic14o3A6unEGbBa52tTTC0wf9KZBVbYFMBq4zaYO',
  'Super Admin'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO migrations (version, filename) VALUES (7, '007_superadmins.sql')
  ON CONFLICT DO NOTHING;
