import { db } from '@/database/db'
import { notFound } from 'next/navigation'
import { extractStorefrontEditorConfig } from '@/lib/storefront-editor'

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode
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

  // Get tenant settings
  const settings = await db
    .selectFrom('tenant_settings')
    .selectAll()
    .where('tenant_id', '=', tenant.id)
    .executeTakeFirst()

  const editor = extractStorefrontEditorConfig(settings?.metadata)
  const colors = editor.colors

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      <main>{children}</main>
      <footer
        className="mt-12 border-t"
        style={{ backgroundColor: colors.surface, borderColor: colors.accent }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 text-center" style={{ color: colors.mutedText }}>
          <p>&copy; {new Date().getFullYear()} {tenant.name}. Powered by posfer.com.</p>
        </div>
      </footer>
    </div>
  )
}
