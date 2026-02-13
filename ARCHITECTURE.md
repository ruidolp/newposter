# VentaFácil - Arquitectura del Sistema

## Visión General

VentaFácil es un sistema multi-tenant de POS (Point of Sale) y ecommerce construido con Next.js y PostgreSQL. La arquitectura está diseñada para ser extensible, escalable y mantenible.

## Principios de Diseño

1. **Multi-tenancy First**: Aislamiento completo de datos por tenant
2. **Extensibilidad**: Sistema de plugins/extensiones mediante hooks
3. **Type Safety**: TypeScript en todo el stack con tipos generados desde la DB
4. **API First**: APIs RESTful bien definidas
5. **Separation of Concerns**: Separación clara entre capas

## Arquitectura de Capas

```
┌─────────────────────────────────────────────────────┐
│                   Presentation Layer                │
│  (Next.js Pages, React Components, UI)              │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                    API Layer                        │
│  (Next.js API Routes, Request Validation)           │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                  Business Logic Layer               │
│  (Services, Extension Hooks, Business Rules)        │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                   Data Access Layer                 │
│  (Kysely Query Builder, Database Operations)        │
└─────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────┐
│                    Database Layer                   │
│  (PostgreSQL, Triggers, Functions)                  │
└─────────────────────────────────────────────────────┘
```

## Multi-Tenancy

### Estrategia: Shared Database, Shared Schema

Todos los tenants comparten la misma base de datos y esquema, pero los datos están aislados mediante `tenant_id`.

**Ventajas:**
- Fácil de mantener y actualizar
- Costos de infraestructura optimizados
- Bueno para escala media (hasta ~1000 tenants)

**Mecanismo:**

1. **Middleware**: Detecta tenant desde subdomain o path
2. **Headers**: Inyecta `x-tenant-slug` en los headers
3. **Data Access**: Todas las queries filtran por `tenant_id`

```typescript
// Middleware inyecta tenant
requestHeaders.set('x-tenant-slug', tenantSlug)

// API routes obtienen tenant
const tenant = await requireTenant()

// Queries filtran por tenant
db.selectFrom('products')
  .where('tenant_id', '=', tenant.id)
```

### Aislamiento de Datos

**Nivel de DB:**
- Foreign keys incluyen `tenant_id`
- Índices compuestos con `tenant_id`
- Row Level Security (futuro)

**Nivel de Aplicación:**
- Todos los queries incluyen filtro `tenant_id`
- Helper `requireTenant()` valida tenant activo
- Middleware previene acceso cruzado

## Sistema de Extensiones

### Arquitectura de Plugins

```
┌─────────────────────────────────────────────────────┐
│                Extension Registry                    │
│  - Registro central de extensiones                   │
│  - Gestión de hooks                                  │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼─────┐  ┌──────▼─────┐
│   Retail     │  │ Restaurant │  │   Medical  │
│  Extension   │  │ Extension  │  │  Extension │
└──────────────┘  └────────────┘  └────────────┘
```

### Hooks System

**Tipos de Hooks:**

1. **Before Hooks**: Modifican datos antes de operación
   ```typescript
   product.beforeCreate(data) => modifiedData
   ```

2. **After Hooks**: Ejecutan lógica después de operación
   ```typescript
   order.afterCreate(order) => void
   ```

3. **Calculate Hooks**: Calculan valores
   ```typescript
   order.calculateTotal(orderData) => calculatedData
   ```

### Ejemplo de Extensión

```typescript
// src/extensions/restaurant/index.ts
export const restaurantExtension: Extension = {
  id: 'restaurant',
  name: 'Restaurant Extension',
  version: '1.0.0',
  hooks: [
    {
      name: 'product.beforeCreate',
      handler: async ({ data, context }) => {
        // Agregar metadata específica de restaurante
        return {
          ...data,
          metadata: {
            ...data.metadata,
            kitchen_section: 'cocina',
            preparation_time: 15
          }
        }
      }
    }
  ]
}
```

## Data Flow

### Crear Producto

```
1. Client POST /api/products
       │
2. API Route: requireTenant()
       │
3. Validar campos requeridos
       │
4. beforeCreateProduct hook
       │  └─> Retail extension valida barcode
       │
5. INSERT INTO products (con tenant_id)
       │
6. afterCreateProduct hook
       │  └─> Retail extension registra evento
       │
7. Return producto creado
```

### Crear Orden

```
1. Client POST /api/orders
       │
2. API Route: requireTenant()
       │
3. Transaction START
       │
4. ├─> Validar items
   ├─> Verificar stock
   ├─> calculateOrderTotal hook (promociones)
   ├─> beforeCreateOrder hook
   ├─> INSERT orden
   ├─> INSERT order_items
   ├─> UPDATE products stock
   └─> INSERT stock_movements
       │
5. Transaction COMMIT
       │
6. afterCreateOrder hook
       │  └─> Enviar recibo, actualizar loyalty, etc.
       │
7. Return orden creada
```

## Database Schema

### Decisiones de Diseño

1. **Barcode en tabla padre**:
   - NO en metadata JSONB
   - Permite índices eficientes
   - Búsquedas rápidas por barcode

2. **JSONB metadata**:
   - Campos custom por extensión
   - Sin modificar esquema core
   - Índices GIN para búsquedas

3. **Triggers automáticos**:
   - `updated_at` auto-actualizado
   - Stock movements automáticos
   - Audit trail completo

### Índices Estratégicos

```sql
-- Búsquedas comunes
CREATE INDEX idx_products_tenant_active
  ON products(tenant_id, active);

-- Barcode lookup
CREATE INDEX idx_products_barcode
  ON products(barcode) WHERE barcode IS NOT NULL;

-- Metadata queries (extension retail)
CREATE INDEX idx_products_metadata_size
  ON products USING gin ((metadata->'size'));
```

## Seguridad

### Autenticación

- NextAuth.js con JWT
- Credentials provider (email/password)
- Session incluye tenant_id y role

### Autorización

```typescript
// Role hierarchy
const roles = ['CASHIER', 'STAFF', 'ADMIN', 'OWNER']

// Permission check
hasPermission(userRole, requiredRole)
```

### Data Isolation

1. Middleware valida tenant
2. API routes usan `requireTenant()`
3. Queries siempre filtran por `tenant_id`
4. Foreign keys previenen referencias cruzadas

## Escalabilidad

### Horizontal Scaling

- Next.js es stateless
- Multiple instances con load balancer
- Session en JWT (no server-side)

### Database Scaling

- Read replicas para queries
- Connection pooling (pg Pool)
- Índices optimizados
- Partitioning por tenant (futuro)

### Caching Strategy

1. **Static Generation**: Storefront pages
2. **ISR**: Product catalog
3. **Client-side**: SWR/React Query
4. **Redis**: Sessions, hot data (futuro)

## Performance

### Optimizaciones Actuales

1. **Database:**
   - Índices compuestos
   - LIMIT en queries
   - Transactions para consistencia

2. **Frontend:**
   - Code splitting automático (Next.js)
   - Image optimization
   - Lazy loading

3. **API:**
   - Pagination
   - Field selection
   - Batch operations

### Monitoring (Futuro)

- APM: Datadog, New Relic
- Error tracking: Sentry
- Logs: CloudWatch, Papertrail
- Metrics: Prometheus + Grafana

## Deployment

### Estrategia Recomendada

```
┌─────────────┐
│   Vercel    │  <- Next.js app
│  (Frontend) │
└──────┬──────┘
       │
┌──────▼──────┐
│   Vercel    │  <- API Routes
│  (Serverless)│
└──────┬──────┘
       │
┌──────▼──────┐
│  PostgreSQL │  <- Supabase, Neon, Railway
│   (Managed) │
└─────────────┘
```

### Environment Variables

```env
# Production
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
NODE_ENV=production
```

## Testing Strategy

### Unit Tests
- Services y utilidades
- Extension hooks
- Business logic

### Integration Tests
- API endpoints
- Database operations
- Multi-tenant isolation

### E2E Tests
- POS workflow
- Order creation
- Storefront purchase

## Roadmap

### v1.1 - Mejoras Core
- [ ] Advanced filters en productos
- [ ] Bulk operations
- [ ] Export de datos
- [ ] Audit logs UI

### v1.2 - Extensiones
- [ ] Restaurant extension
- [ ] Medical center extension
- [ ] Custom fields builder

### v2.0 - Enterprise
- [ ] Row Level Security
- [ ] Advanced analytics
- [ ] Multi-currency
- [ ] Multi-warehouse

## Conclusión

VentaFácil está diseñado para ser:
- **Extensible**: Sistema de plugins robusto
- **Escalable**: Multi-tenant eficiente
- **Mantenible**: Type-safe y bien estructurado
- **Performante**: Optimizado para operaciones frecuentes

La arquitectura permite agregar nuevas funcionalidades sin modificar el core, haciendo el sistema adaptable a diferentes rubros y necesidades.
