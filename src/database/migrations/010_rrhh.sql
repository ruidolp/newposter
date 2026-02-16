-- Migration 010: Módulo RRHH
-- Tablas aisladas con prefijo rrhh_ para futura migración a sistema independiente.
-- Todas las tablas son multi-tenant via tenant_id.

-- ─────────────────────────────────────────────
-- Configuración por país (parámetros legales)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_country_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_code          VARCHAR(2) NOT NULL DEFAULT 'CL',  -- ISO 3166-1 alpha-2
  -- Vacaciones
  vacation_days_per_year  INTEGER NOT NULL DEFAULT 15,      -- días hábiles
  vacation_years_progressive INTEGER NOT NULL DEFAULT 10,   -- años para día adicional
  vacation_extra_day    INTEGER NOT NULL DEFAULT 1,         -- días adicionales por antigüedad
  -- Cotizaciones Chile (en porcentaje, ej: 10.00 = 10%)
  afp_rate              NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  health_rate           NUMERIC(5,2) NOT NULL DEFAULT 7.00,
  unemployment_rate     NUMERIC(5,2) NOT NULL DEFAULT 0.60,  -- seguro cesantía trabajador
  unemployment_rate_employer NUMERIC(5,2) NOT NULL DEFAULT 2.40, -- seguro cesantía empleador
  -- HHEE
  overtime_regular_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 1.50,  -- hasta 2 HHEE/día
  overtime_special_multiplier  NUMERIC(4,2) NOT NULL DEFAULT 2.00,  -- domingo/festivo
  max_overtime_hours_week INTEGER NOT NULL DEFAULT 10,
  -- UF referencia (se actualiza periódicamente)
  uf_value              NUMERIC(10,2),
  utm_value             NUMERIC(10,2),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, country_code)
);

-- ─────────────────────────────────────────────
-- Empleados (ficha del trabajador)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Datos personales
  rut                   VARCHAR(12) NOT NULL,               -- RUT chileno o equivalente
  full_name             VARCHAR(255) NOT NULL,
  email                 VARCHAR(255),
  phone                 VARCHAR(20),
  address               VARCHAR(500),
  birth_date            DATE,
  nationality           VARCHAR(100) DEFAULT 'Chilena',
  -- Datos laborales
  employee_code         VARCHAR(50),                         -- código interno opcional
  position              VARCHAR(100) NOT NULL,              -- cargo
  department            VARCHAR(100),                        -- área/departamento
  hire_date             DATE NOT NULL,
  contract_type         VARCHAR(30) NOT NULL DEFAULT 'indefinido', -- indefinido | plazo_fijo | honorarios | part_time
  status                VARCHAR(20) NOT NULL DEFAULT 'active', -- active | inactive | terminated
  -- Jerarquía
  manager_id            UUID REFERENCES rrhh_employees(id),  -- líder/jefe directo
  user_id               UUID REFERENCES users(id),           -- usuario del sistema vinculado (opcional)
  -- País (para cálculos legales)
  country_code          VARCHAR(2) NOT NULL DEFAULT 'CL',
  -- Banco para pago
  bank_name             VARCHAR(100),
  bank_account_type     VARCHAR(30),                         -- cuenta_corriente | cuenta_vista | cuenta_rut
  bank_account_number   VARCHAR(50),
  -- Metadata
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, rut)
);

-- ─────────────────────────────────────────────
-- Contratos e historial de sueldos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_contracts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES rrhh_employees(id) ON DELETE CASCADE,
  contract_type         VARCHAR(30) NOT NULL,
  base_salary           NUMERIC(12,2) NOT NULL,             -- sueldo base bruto
  daily_rate            NUMERIC(10,2),                       -- valor día (para cálculos proporcionales)
  hourly_rate           NUMERIC(10,2),                       -- valor hora (para HHEE)
  currency              VARCHAR(3) NOT NULL DEFAULT 'CLP',
  start_date            DATE NOT NULL,
  end_date              DATE,                                 -- null = indefinido
  is_current            BOOLEAN NOT NULL DEFAULT true,
  afp_institution       VARCHAR(100),                        -- AFP específica del trabajador
  health_institution    VARCHAR(100),                        -- Isapre/Fonasa
  health_additional_rate NUMERIC(5,2) DEFAULT 0,            -- adicional Isapre
  -- Beneficios adicionales
  transport_allowance   NUMERIC(10,2) DEFAULT 0,
  food_allowance        NUMERIC(10,2) DEFAULT 0,
  other_allowances      NUMERIC(10,2) DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Saldo de vacaciones
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_vacation_balances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES rrhh_employees(id) ON DELETE CASCADE,
  year                  INTEGER NOT NULL,
  days_earned           NUMERIC(5,2) NOT NULL DEFAULT 0,    -- días ganados en el año
  days_taken            NUMERIC(5,2) NOT NULL DEFAULT 0,    -- días tomados
  days_carried          NUMERIC(5,2) NOT NULL DEFAULT 0,    -- días arrastrados del año anterior
  days_lost             NUMERIC(5,2) NOT NULL DEFAULT 0,    -- días vencidos/perdidos
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, year)
);

-- ─────────────────────────────────────────────
-- Solicitudes (vacaciones y permisos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES rrhh_employees(id) ON DELETE CASCADE,
  request_type          VARCHAR(30) NOT NULL,               -- vacaciones | permiso_con_goce | permiso_sin_goce | otro
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  working_days          INTEGER NOT NULL DEFAULT 0,          -- días hábiles calculados
  reason                TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected | cancelled
  -- Aprobación
  reviewed_by_user_id   UUID REFERENCES users(id),          -- quien aprobó/rechazó
  reviewed_at           TIMESTAMP,
  review_notes          TEXT,
  -- Trazabilidad
  created_by_user_id    UUID REFERENCES users(id),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Horas extra (HHEE)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_overtime (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES rrhh_employees(id) ON DELETE CASCADE,
  overtime_date         DATE NOT NULL,
  hours                 NUMERIC(4,2) NOT NULL,               -- horas trabajadas extra
  overtime_type         VARCHAR(20) NOT NULL DEFAULT 'regular', -- regular | domingo | festivo
  multiplier            NUMERIC(4,2) NOT NULL DEFAULT 1.50,  -- factor aplicado
  hourly_rate           NUMERIC(10,2) NOT NULL,              -- valor hora base en el momento
  amount                NUMERIC(12,2) NOT NULL,              -- monto calculado (hours * rate * multiplier)
  status                VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected | paid
  description           TEXT,
  approved_by_user_id   UUID REFERENCES users(id),
  approved_at           TIMESTAMP,
  payroll_id            UUID,                                 -- se llenará cuando se incluya en liquidación
  created_by_user_id    UUID REFERENCES users(id),
  created_at            TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Liquidaciones de sueldo
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rrhh_payrolls (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES rrhh_employees(id) ON DELETE CASCADE,
  contract_id           UUID REFERENCES rrhh_contracts(id),
  period_year           INTEGER NOT NULL,
  period_month          INTEGER NOT NULL,                    -- 1-12
  -- Haberes
  base_salary           NUMERIC(12,2) NOT NULL,
  overtime_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  food_allowance        NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary          NUMERIC(12,2) NOT NULL,             -- total haberes
  -- Descuentos legales
  afp_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  unemployment_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,   -- impuesto único 2da categoría
  -- Otros descuentos
  other_deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions      NUMERIC(12,2) NOT NULL,
  -- Neto
  net_salary            NUMERIC(12,2) NOT NULL,
  -- Tasas aplicadas (snapshot del momento)
  afp_rate_applied      NUMERIC(5,2),
  health_rate_applied   NUMERIC(5,2),
  -- Metadata
  status                VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | issued | paid
  working_days          INTEGER NOT NULL DEFAULT 30,
  absent_days           INTEGER NOT NULL DEFAULT 0,
  vacation_days_in_period INTEGER NOT NULL DEFAULT 0,
  notes                 TEXT,
  pdf_path              TEXT,                                -- ruta del PDF generado
  issued_at             TIMESTAMP,
  paid_at               TIMESTAMP,
  created_by_user_id    UUID REFERENCES users(id),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, period_year, period_month)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rrhh_employees_tenant ON rrhh_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_employees_status ON rrhh_employees(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rrhh_contracts_employee ON rrhh_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_requests_employee ON rrhh_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_requests_status ON rrhh_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rrhh_overtime_employee ON rrhh_overtime(employee_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_payrolls_employee ON rrhh_payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_payrolls_period ON rrhh_payrolls(tenant_id, period_year, period_month);

-- FK diferida para payroll_id en overtime (evita dependencia circular)
ALTER TABLE rrhh_overtime ADD CONSTRAINT fk_overtime_payroll
  FOREIGN KEY (payroll_id) REFERENCES rrhh_payrolls(id) DEFERRABLE INITIALLY DEFERRED;

INSERT INTO migrations (version, filename) VALUES (10, '010_rrhh.sql')
  ON CONFLICT DO NOTHING;
