-- VentaFácil Seed Data
-- Initial demo data for testing

-- Insert demo tenant
INSERT INTO tenants (slug, name) VALUES ('demo-store', 'Tienda Demo');

-- Get tenant id and create related data
DO $$
DECLARE
  demo_tenant_id UUID;
  admin_user_id UUID;
  cat_ropa_id UUID;
  cat_electro_id UUID;
  cat_alimentos_id UUID;
BEGIN
  SELECT id INTO demo_tenant_id FROM tenants WHERE slug = 'demo-store';

  -- Tenant settings
  INSERT INTO tenant_settings (tenant_id, extensions)
  VALUES (demo_tenant_id, '["retail"]');

  -- Demo admin user (password: admin123)
  INSERT INTO users (tenant_id, email, password_hash, name, role)
  VALUES (
    demo_tenant_id,
    'admin@demo.com',
    '$2a$10$PCeoIJLleA3gnqyG3f05AODgWwFy2foIx7sWNaGssUMVZbO0cxlvG',
    'Admin Demo',
    'OWNER'
  ) RETURNING id INTO admin_user_id;

  -- Demo cashier user (password: cashier123)
  INSERT INTO users (tenant_id, email, password_hash, name, role)
  VALUES (
    demo_tenant_id,
    'cashier@demo.com',
    '$2a$10$peU5o9Y5Ms.DWO1h9AQjquklPjr6NiwWBDOWcUcbeEvTPxJBY3QbW',
    'Cajero Demo',
    'CASHIER'
  );

  -- Demo categories
  INSERT INTO categories (tenant_id, name, slug) VALUES
    (demo_tenant_id, 'Ropa', 'ropa') RETURNING id INTO cat_ropa_id;

  INSERT INTO categories (tenant_id, name, slug) VALUES
    (demo_tenant_id, 'Electrónica', 'electronica') RETURNING id INTO cat_electro_id;

  INSERT INTO categories (tenant_id, name, slug) VALUES
    (demo_tenant_id, 'Alimentos', 'alimentos') RETURNING id INTO cat_alimentos_id;

  -- Demo products - Ropa
  INSERT INTO products (tenant_id, category_id, name, description, sku, barcode, base_price, cost, stock, metadata)
  VALUES
    (demo_tenant_id, cat_ropa_id, 'Polera Básica', 'Polera de algodón 100%', 'POL-001', '7801234567890', 9990, 5000, 50, '{"size": "M", "color": "Azul"}'),
    (demo_tenant_id, cat_ropa_id, 'Jeans Clásico', 'Jeans corte regular', 'JEA-001', '7801234567891', 19990, 10000, 30, '{"size": "32", "color": "Negro"}'),
    (demo_tenant_id, cat_ropa_id, 'Zapatillas Deportivas', 'Zapatillas running', 'ZAP-001', '7801234567892', 29990, 15000, 20, '{"size": "42", "color": "Blanco"}');

  -- Demo products - Electrónica
  INSERT INTO products (tenant_id, category_id, name, description, sku, barcode, base_price, cost, stock, metadata)
  VALUES
    (demo_tenant_id, cat_electro_id, 'Audífonos Bluetooth', 'Audífonos inalámbricos', 'AUD-001', '7801234567893', 14990, 8000, 25, '{"warranty": "12 meses", "brand": "TechPro"}'),
    (demo_tenant_id, cat_electro_id, 'Mouse Inalámbrico', 'Mouse ergonómico', 'MOU-001', '7801234567894', 7990, 4000, 40, '{"warranty": "6 meses", "brand": "TechPro"}'),
    (demo_tenant_id, cat_electro_id, 'Teclado Mecánico', 'Teclado gaming RGB', 'TEC-001', '7801234567895', 39990, 20000, 15, '{"warranty": "24 meses", "brand": "GamePro"}');

  -- Demo products - Alimentos
  INSERT INTO products (tenant_id, category_id, name, description, sku, barcode, base_price, cost, stock, metadata)
  VALUES
    (demo_tenant_id, cat_alimentos_id, 'Café Premium', 'Café grano 500g', 'CAF-001', '7801234567896', 5990, 3000, 60, '{"weight": "500g", "origin": "Colombia"}'),
    (demo_tenant_id, cat_alimentos_id, 'Chocolate Artesanal', 'Chocolate 70% cacao', 'CHO-001', '7801234567897', 3990, 2000, 80, '{"weight": "100g", "cacao": "70%"}'),
    (demo_tenant_id, cat_alimentos_id, 'Té Verde Orgánico', 'Té verde 25 sobres', 'TEV-001', '7801234567898', 4990, 2500, 45, '{"quantity": "25 sobres", "organic": true}');

  -- Demo customers
  INSERT INTO customers (tenant_id, name, email, phone)
  VALUES
    (demo_tenant_id, 'Juan Pérez', 'juan@example.com', '+56912345678'),
    (demo_tenant_id, 'María González', 'maria@example.com', '+56987654321'),
    (demo_tenant_id, 'Cliente Genérico', NULL, NULL);

END $$;
