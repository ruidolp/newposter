# VentaFácil - Sistema POS + Ecommerce

Sistema completo de punto de venta y comercio electrónico con arquitectura extensible mediante plugins.

## 🚀 Características

- **Multi-tenant**: Soporte para múltiples tiendas en una sola instalación
- **POS Web Responsive**: Interfaz de punto de venta optimizada para móviles y tablets
- **Ecommerce**: Tienda online con catálogo de productos
- **Gestión de Inventario**: Control de stock con movimientos auditables
- **Sistema de Extensiones**: Arquitectura de plugins para personalización
- **Extensión Retail**: Soporte para códigos de barras, variantes y promociones

## 🛠 Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL
- **ORM**: Kysely (TypeScript SQL Query Builder)
- **Autenticación**: NextAuth.js

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd ventafacil
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
DATABASE_URL="postgresql://ventafacil_user:ventafacil_password@localhost:5432/ventafacil_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-clave-secreta-aqui"
NODE_ENV="development"
```

### 4. Crear la base de datos

```bash
npm run db:create
```

Esto creará:
- Base de datos `ventafacil_dev`
- Usuario `ventafacil_user`
- Extensión UUID

### 5. Ejecutar migraciones

```bash
npm run migrate
```

Esto ejecutará:
- `001_initial_schema.sql` - Esquema core
- `002_seed_data.sql` - Datos de prueba
- `003_retail_extension.sql` - Extensión retail

### 6. Generar tipos de TypeScript

```bash
npm run generate-types
```

### 7. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
ventafacil/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # Área administrativa
│   │   │   └── pos/              # Punto de venta
│   │   ├── (storefront)/         # Tienda pública
│   │   │   └── [tenant]/         # Sitio multi-tenant
│   │   └── api/                  # API Routes
│   │       ├── products/         # API de productos
│   │       ├── orders/           # API de órdenes
│   │       └── auth/             # Autenticación
│   │
│   ├── components/               # Componentes React
│   │   └── ui/                   # shadcn/ui components
│   │
│   ├── database/                 # Database layer
│   │   ├── migrations/           # SQL migrations
│   │   ├── db.ts                 # Kysely instance
│   │   └── schema.ts             # Generated types
│   │
│   ├── lib/                      # Utilidades
│   │   ├── extensions/           # Sistema de extensiones
│   │   │   ├── registry.ts       # Registro de extensiones
│   │   │   ├── hooks.ts          # Sistema de hooks
│   │   │   └── loader.ts         # Cargador de extensiones
│   │   ├── auth.ts               # Autenticación
│   │   ├── tenant.ts             # Multi-tenancy helpers
│   │   └── utils.ts              # Utilidades generales
│   │
│   ├── extensions/               # Extensiones
│   │   └── retail/               # Extensión retail
│   │       ├── index.ts
│   │       ├── hooks.ts
│   │       └── services/
│   │
│   └── types/                    # TypeScript types
│
└── scripts/                      # Scripts de utilidad
    ├── create-db.sh             # Crear base de datos
    ├── migrate.ts               # Ejecutar migraciones
    └── generate-types.ts        # Generar tipos Kysely
```

## 🗄 Esquema de Base de Datos

### Tablas Core

- **tenants**: Organizaciones/tiendas
- **tenant_settings**: Configuración por tenant
- **users**: Usuarios del sistema
- **categories**: Categorías de productos
- **products**: Productos (incluye barcode)
- **customers**: Clientes
- **orders**: Órdenes de venta
- **order_items**: Items de órdenes
- **stock_movements**: Movimientos de inventario

### Extensión Retail

- **brands**: Marcas
- **product_variants**: Variantes de productos (tallas, colores)
- **promotions**: Promociones y descuentos

## 🔌 Sistema de Extensiones

VentaFácil utiliza un sistema de hooks para permitir extensiones:

### Hooks Disponibles

- `product.beforeCreate`: Antes de crear producto
- `product.afterCreate`: Después de crear producto
- `product.beforeUpdate`: Antes de actualizar producto
- `product.afterUpdate`: Después de actualizar producto
- `order.beforeCreate`: Antes de crear orden
- `order.afterCreate`: Después de crear orden
- `order.calculateTotal`: Calcular total de orden

### Crear una Extensión

```typescript
// src/extensions/mi-extension/index.ts
import type { Extension } from '@/types/extensions'

export const miExtension: Extension = {
  id: 'mi-extension',
  name: 'Mi Extensión',
  version: '1.0.0',
  description: 'Descripción de mi extensión',
  enabled: true,
  hooks: [
    {
      name: 'product.beforeCreate',
      handler: async (payload) => {
        // Tu lógica aquí
        return payload.data
      },
    },
  ],
}
```

Registrar en `src/lib/extensions/loader.ts`:

```typescript
import { miExtension } from '@/extensions/mi-extension'

export function loadExtensions() {
  extensionRegistry.register(miExtension)
}
```

## 📡 API Endpoints

### Productos

```
GET    /api/products              # Listar productos
POST   /api/products              # Crear producto
GET    /api/products/:id          # Obtener producto
PATCH  /api/products/:id          # Actualizar producto
DELETE /api/products/:id          # Eliminar producto (soft delete)
```

### Órdenes

```
GET    /api/orders                # Listar órdenes
POST   /api/orders                # Crear orden
GET    /api/orders/:id            # Obtener orden con items
PATCH  /api/orders/:id            # Actualizar estado de orden
```

### Autenticación

```
POST   /api/auth/[...nextauth]   # NextAuth endpoints
```

## 👤 Usuarios Demo

Después de ejecutar las migraciones, estarán disponibles:

**Admin:**
- Email: `admin@demo.com`
- Password: `admin123`
- Tenant: `demo-store`

**Cajero:**
- Email: `cashier@demo.com`
- Password: `cashier123`
- Tenant: `demo-store`

## 🛒 Uso del POS

1. Accede a `http://localhost:3000/pos`
2. Busca productos por nombre, SKU o código de barras
3. Haz clic en un producto para agregarlo al carrito
4. Ajusta cantidades con los botones +/-
5. Haz clic en "Procesar Pago" para completar la venta

## 🏪 Ecommerce

Accede a la tienda pública en:

```
http://localhost:3000/demo-store
```

## 🔄 Comandos Útiles

```bash
# Desarrollo
npm run dev                    # Iniciar servidor de desarrollo
npm run build                  # Build para producción
npm run start                  # Iniciar servidor de producción

# Base de datos
npm run db:create             # Crear base de datos
npm run migrate               # Ejecutar migraciones
npm run generate-types        # Generar tipos Kysely

# Utilidades
npm run lint                  # Ejecutar ESLint
npm run type-check            # Verificar tipos TypeScript
```

## 🧪 Testing

```bash
# Verificar que la base de datos fue creada
psql ventafacil_dev -c "\dt"

# Verificar datos seed
psql ventafacil_dev -c "SELECT * FROM tenants;"
psql ventafacil_dev -c "SELECT * FROM products;"

# Test API
curl http://localhost:3000/api/products
```

## 📝 Próximos Pasos

1. **Autenticación UI**: Crear formularios de login/register
2. **Dashboard**: Panel de control con métricas
3. **Gestión de Inventario**: UI para ajustes de stock
4. **Reportes**: Ventas, productos más vendidos, etc.
5. **Integración de Pagos**: Mercado Pago, Flow, etc.
6. **Chatbot**: Integrar sistema de chatbot para ventas
7. **PWA**: Convertir en Progressive Web App
8. **Impresión de Tickets**: Soporte para impresoras térmicas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🆘 Soporte

Para reportar bugs o solicitar features, por favor abre un issue en GitHub.

---

Desarrollado con ❤️ usando Next.js y PostgreSQL
