import { db } from '@/database/db'
import { notFound } from 'next/navigation'

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

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t bg-gray-50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} {tenant.name}. Powered by VentaFácil.</p>
        </div>
      </footer>
    </div>
  )
}
