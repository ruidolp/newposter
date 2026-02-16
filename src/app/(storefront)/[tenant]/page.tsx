import { db } from '@/database/db'
import { notFound } from 'next/navigation'
import { extractStorefrontEditorConfig } from '@/lib/storefront-editor'
import StorefrontClient from './StorefrontClient'

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params

  const tenant = await db
    .selectFrom('tenants')
    .selectAll()
    .where('slug', '=', tenantSlug)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!tenant) {
    notFound()
  }

  const [categories, products, settings] = await Promise.all([
    db.selectFrom('categories').select(['id', 'name']).where('tenant_id', '=', tenant.id).execute(),
    db
      .selectFrom('products')
      .select(['id', 'name', 'description', 'base_price', 'stock'])
      .where('tenant_id', '=', tenant.id)
      .where('active', '=', true)
      .orderBy('created_at', 'desc')
      .limit(24)
      .execute(),
    db.selectFrom('tenant_settings').selectAll().where('tenant_id', '=', tenant.id).executeTakeFirst(),
  ])

  const productIds = products.map((product) => product.id)
  const variants = productIds.length
    ? await db
      .selectFrom('product_variants')
      .select(['id', 'product_id', 'price', 'stock', 'attributes', 'active', 'sku'])
        .where('tenant_id', '=', tenant.id)
        .where('product_id', 'in', productIds)
        .where('active', '=', true)
        .execute()
    : []

  const editor = extractStorefrontEditorConfig(settings?.metadata)

  return (
    <StorefrontClient
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      logo={settings?.logo ?? ''}
      colors={editor.colors}
      blocks={editor.blocks.filter((block) => block.enabled)}
      categories={categories}
      products={products}
      variants={variants}
      currency={settings?.currency ?? 'CLP'}
      heroImageUrl={editor.heroImageUrl}
      lookbookImageUrl={editor.lookbookImageUrl}
      typography={editor.typography}
      promoBar={editor.promoBar}
    />
  )
}
