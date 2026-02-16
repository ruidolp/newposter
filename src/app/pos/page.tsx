import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'
import PosClient from './PosClient'

export default async function PosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tenant = await requireTenant()
  const userId = (session.user as { id?: string })?.id ?? ''

  const [settings, allLocations] = await Promise.all([
    db.selectFrom('tenant_settings').select(['metadata']).where('tenant_id', '=', tenant.id).executeTakeFirst(),
    db.selectFrom('locations').selectAll().where('tenant_id', '=', tenant.id as any).where('active', '=', true)
      .orderBy('is_default', 'desc').orderBy('name', 'asc').execute(),
  ])

  const meta = (settings?.metadata ?? {}) as Record<string, unknown>
  const printEnabled = meta.print_ticket === true

  // Filter locations by user's allowed_location_ids (stored in users.metadata)
  const userRow = await db.selectFrom('users').select('metadata').where('id', '=', userId as any).executeTakeFirst()
  const userMeta = (userRow?.metadata ?? {}) as Record<string, unknown>
  const allowedIds = userMeta.allowed_location_ids as string[] | undefined

  const locations = allowedIds?.length
    ? allLocations.filter((l) => allowedIds.includes(l.id))
    : allLocations

  return (
    <PosClient
      storeName={tenant.name}
      userName={session.user?.name ?? ''}
      userId={userId}
      userRole={(session.user as { role?: string })?.role ?? 'CASHIER'}
      printEnabled={printEnabled}
      locations={locations.map((l) => ({ id: l.id, name: l.name, type: l.type, is_default: l.is_default }))}
    />
  )
}
