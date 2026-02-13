import { db } from '@/database/db'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params

  // Get tenant
  const tenant = await db
    .selectFrom('tenants')
    .selectAll()
    .where('slug', '=', tenantSlug)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!tenant) {
    notFound()
  }

  // Get categories
  const categories = await db
    .selectFrom('categories')
    .selectAll()
    .where('tenant_id', '=', tenant.id)
    .execute()

  // Get products
  const products = await db
    .selectFrom('products')
    .selectAll()
    .where('tenant_id', '=', tenant.id)
    .where('active', '=', true)
    .orderBy('created_at', 'desc')
    .limit(20)
    .execute()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12">
        <h2 className="text-4xl font-bold mb-4">Bienvenido a {tenant.name}</h2>
        <p className="text-xl text-gray-600">
          Descubre nuestros productos y encuentra lo que necesitas
        </p>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-4">Categorías</h3>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {categories.map((category) => (
              <Button key={category.id} variant="outline" className="whitespace-nowrap">
                {category.name}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section>
        <h3 className="text-2xl font-bold mb-6">Productos</h3>
        {products.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No hay productos disponibles en este momento
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl">📦</span>
                  </div>
                  <h4 className="font-semibold text-lg mb-2 line-clamp-2">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(parseFloat(product.base_price))}
                    </span>
                    <Button size="sm">Agregar</Button>
                  </div>
                  {product.stock && product.stock > 0 ? (
                    <p className="text-xs text-green-600 mt-2">
                      En stock: {product.stock}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 mt-2">Sin stock</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
