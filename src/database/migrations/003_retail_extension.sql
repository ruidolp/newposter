-- VentaFácil Retail Extension
-- Additional tables and indexes for retail-specific features

-- Índices específicos para retail (búsqueda por variantes en metadata)
CREATE INDEX idx_products_metadata_size ON products USING gin ((metadata->'size'));
CREATE INDEX idx_products_metadata_color ON products USING gin ((metadata->'color'));
CREATE INDEX idx_products_metadata_brand ON products USING gin ((metadata->'brand'));

-- Tabla para promociones/descuentos (retail specific)
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) CHECK (type IN ('PERCENTAGE', 'FIXED', 'BUY_X_GET_Y', 'FREE_SHIPPING')),
  value DECIMAL(10, 2) NOT NULL,

  -- Conditions
  min_purchase DECIMAL(10, 2),
  product_ids JSONB DEFAULT '[]',
  category_ids JSONB DEFAULT '[]',

  -- Status
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promotions_tenant_active ON promotions(tenant_id, active);
CREATE INDEX idx_promotions_dates ON promotions(starts_at, ends_at) WHERE active = true;

-- Tabla para variantes de productos (tallas, colores, etc.)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),

  -- Variant attributes
  attributes JSONB NOT NULL, -- {"size": "L", "color": "Red"}

  -- Pricing (puede sobrescribir el precio base)
  price DECIMAL(12, 2),

  -- Inventory
  stock INTEGER DEFAULT 0,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, sku)
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;

-- Tabla para marcas/brands
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  logo TEXT,
  website VARCHAR(500),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_brands_tenant ON brands(tenant_id);

-- Agregar columna brand_id a products
ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
CREATE INDEX idx_products_brand ON products(brand_id);

-- Trigger para actualizar updated_at en promotions
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed: Agregar algunas marcas demo para el tenant demo
DO $$
DECLARE
  demo_tenant_id UUID;
  brand_techpro_id UUID;
  brand_gamepro_id UUID;
BEGIN
  SELECT id INTO demo_tenant_id FROM tenants WHERE slug = 'demo-store';

  IF demo_tenant_id IS NOT NULL THEN
    -- Crear marcas
    INSERT INTO brands (tenant_id, name, slug)
    VALUES
      (demo_tenant_id, 'TechPro', 'techpro') RETURNING id INTO brand_techpro_id;

    INSERT INTO brands (tenant_id, name, slug)
    VALUES
      (demo_tenant_id, 'GamePro', 'gamepro') RETURNING id INTO brand_gamepro_id;

    -- Actualizar productos con marcas
    UPDATE products
    SET brand_id = brand_techpro_id
    WHERE tenant_id = demo_tenant_id
      AND (metadata->>'brand' = 'TechPro');

    UPDATE products
    SET brand_id = brand_gamepro_id
    WHERE tenant_id = demo_tenant_id
      AND (metadata->>'brand' = 'GamePro');

    -- Crear una promoción demo
    INSERT INTO promotions (tenant_id, name, description, type, value, active, starts_at, ends_at)
    VALUES (
      demo_tenant_id,
      'Descuento Electrónica 10%',
      '10% de descuento en productos de electrónica',
      'PERCENTAGE',
      10,
      true,
      NOW(),
      NOW() + INTERVAL '30 days'
    );
  END IF;
END $$;
