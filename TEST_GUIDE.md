# Guía de Prueba - VentaFácil

## 🔧 Problemas Solucionados

### 1. Middleware Multi-Tenant
**Problema:** El middleware no detectaba el tenant en localhost
**Solución:** Ahora siempre usa `demo-store` como default

### 2. Autenticación
**Problema:** Las contraseñas no estaban hasheadas correctamente
**Solución:** Actualizado con bcrypt hashes reales

### 3. Páginas Faltantes
**Problema:** No existían páginas de login/register
**Solución:** Creadas en `src/app/(auth)/`

## 🚀 Cómo Probar el Sistema

### 1. Verificar que el servidor esté corriendo
```bash
npm run dev
```

### 2. Probar la API directamente

**Listar productos:**
```bash
curl http://localhost:3000/api/products
```

Deberías ver 9 productos en la respuesta.

**Buscar producto:**
```bash
curl "http://localhost:3000/api/products?search=polera"
```

### 3. Probar el POS

1. Abre: http://localhost:3000/pos
2. Deberías ver productos cargándose
3. Haz clic en un producto para agregarlo al carrito
4. Ajusta cantidades con +/-
5. Haz clic en "Procesar Pago"

### 4. Probar Login

1. Abre: http://localhost:3000/login
2. Usa credenciales:
   - Email: `admin@demo.com`
   - Password: `admin123`
3. Deberías ser redirigido a `/pos`

### 5. Probar Storefront

1. Abre: http://localhost:3000/demo-store
2. Deberías ver el catálogo de productos
3. Navega por categorías

## 🐛 Si Aún No Funciona

### Verificar Tenant en Base de Datos
```bash
psql ventafacil_dev -c "SELECT slug, name, active FROM tenants;"
```

Debe mostrar:
```
    slug     |    name     | active
-------------+-------------+--------
 demo-store  | Tienda Demo | t
```

### Verificar Usuarios
```bash
psql ventafacil_dev -c "SELECT email, role FROM users;"
```

Debe mostrar:
```
      email       |  role
------------------+---------
 admin@demo.com   | OWNER
 cashier@demo.com | CASHIER
```

### Verificar Productos
```bash
psql ventafacil_dev -c "SELECT name, sku, stock, base_price FROM products LIMIT 3;"
```

### Ver Logs del Servidor

En la terminal donde corre `npm run dev`, deberías ver:
```
✅ Extensions loaded
GET /pos 200 in XXXms
GET /api/products 200 in XXXms
```

## 🔍 Debugging

### Error: "Tenant not found or inactive"

**Causa:** El middleware no está inyectando el tenant
**Solución:**
1. Verifica que el servidor esté reiniciado después de los cambios
2. Revisa que `src/middleware.ts` tenga el código actualizado
3. Limpia el cache de Next.js: `rm -rf .next && npm run dev`

### Error: "Invalid credentials"

**Causa:** Contraseña incorrecta o hash no actualizado
**Solución:**
```bash
# Re-actualizar hashes
psql ventafacil_dev << 'EOF'
UPDATE users SET password_hash = '$2a$10$dxBNGVbrWqfD20p994Cu4eKGABEEbSUgwdGw6KT5oxpJfKbNWsmO.' WHERE email = 'admin@demo.com';
UPDATE users SET password_hash = '$2a$10$LtK5x/lY6eUUApqL7qCbZ.O76.rT96koFYoCKVkrA2trw/LKWTMAO' WHERE email = 'cashier@demo.com';
EOF
```

### POS muestra "No hay productos disponibles"

**Causa:** Productos no están activos o hay error en la query
**Solución:**
```bash
# Verificar productos activos
psql ventafacil_dev -c "SELECT COUNT(*) FROM products WHERE active = true;"
```

Debe mostrar al menos 9 productos.

## ✅ Prueba de Flujo Completo

### 1. Crear una Orden desde el POS

```bash
# Terminal 1: Mantener servidor corriendo
npm run dev

# Terminal 2: Crear orden vía API
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": "ID_DE_PRODUCTO", "quantity": 2}
    ],
    "channel": "POS",
    "payment_status": "PAID"
  }'
```

**Para obtener un ID de producto:**
```bash
curl http://localhost:3000/api/products | jq '.[0].id'
```

### 2. Verificar la Orden

```bash
psql ventafacil_dev -c "SELECT order_number, total, status FROM orders LIMIT 1;"
```

### 3. Verificar Stock Actualizado

```bash
psql ventafacil_dev -c "SELECT name, stock FROM products WHERE name LIKE '%Polera%';"
```

El stock debería haberse reducido.

## 🎯 Checklist de Funcionalidad

- [ ] Página de inicio carga correctamente
- [ ] Login funciona con credenciales demo
- [ ] POS muestra lista de productos
- [ ] Se pueden agregar productos al carrito
- [ ] Se pueden ajustar cantidades
- [ ] Se puede crear una orden
- [ ] El stock se reduce automáticamente
- [ ] Storefront muestra catálogo público
- [ ] API responde correctamente

## 📝 Siguientes Pasos

1. **Implementar Guards de Autenticación**
   - Proteger rutas `/pos` con middleware
   - Verificar sesión de NextAuth

2. **Mejorar Manejo de Errores**
   - Toast notifications
   - Mensajes de error más descriptivos

3. **Agregar Más Funcionalidad**
   - Búsqueda por código de barras
   - Filtros por categoría
   - Historial de órdenes
   - Dashboard con métricas

## 🆘 Soporte

Si sigues teniendo problemas:

1. Reinicia el servidor: `Ctrl+C` y luego `npm run dev`
2. Limpia cache: `rm -rf .next`
3. Verifica la base de datos: `psql ventafacil_dev`
4. Revisa los logs en la terminal

---

**Sistema listo para desarrollo!** 🚀
