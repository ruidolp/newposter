-- Agrega rol EMPLOYEE al check constraint de users.role
-- Necesario para empleados que solo usan el módulo RRHH (no el POS)

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CASHIER', 'EMPLOYEE'));
