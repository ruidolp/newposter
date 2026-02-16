import { redirect } from 'next/navigation'
import { getSuperadminId } from '@/lib/superadmin-auth'
import { db } from '@/database/db'
import SuperadminDashboardClient from './DashboardClient'

export default async function SuperadminDashboardPage() {
  const id = await getSuperadminId()
  if (!id) redirect('/superadmin/login')

  const admin = await db
    .selectFrom('superadmins')
    .select(['name', 'email'])
    .where('id', '=', id)
    .executeTakeFirst()

  return <SuperadminDashboardClient adminName={admin?.name ?? 'Admin'} />
}
