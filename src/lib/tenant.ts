import { headers } from 'next/headers'
import { db } from '@/database/db'

/**
 * Get current tenant slug from request headers
 */
export async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

/**
 * Get current tenant from database
 */
export async function getCurrentTenant() {
  const slug = await getTenantSlug()

  if (!slug) {
    return null
  }

  const tenant = await db
    .selectFrom('tenants')
    .selectAll()
    .where('slug', '=', slug)
    .where('active', '=', true)
    .executeTakeFirst()

  return tenant || null
}

/**
 * Require tenant or throw error
 */
export async function requireTenant() {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    throw new Error('Tenant not found or inactive')
  }

  return tenant
}

/**
 * Get tenant settings
 */
export async function getTenantSettings(tenantId: string) {
  const settings = await db
    .selectFrom('tenant_settings')
    .selectAll()
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst()

  return settings
}
