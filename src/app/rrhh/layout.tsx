import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth-options'
import { db } from '@/database/db'
import { getCurrentTenant } from '@/lib/tenant'
import RrhhShell from './RrhhShell'

interface Props {
  children: React.ReactNode
  // Next.js App Router pasa params pero no pathname en layouts.
  // Usamos un workaround: la página /activar tiene su propio check.
}

export default async function RrhhLayout({ children }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as string
  if (!['ADMIN', 'OWNER', 'EMPLOYEE'].includes(role)) redirect('/admin/dashboard')

  const tenant = await getCurrentTenant()
  if (!tenant) redirect('/login')

  // Verificar si el módulo RRHH está activo
  const settings = await db
    .selectFrom('tenant_settings')
    .select('metadata')
    .where('tenant_id', '=', tenant.id)
    .executeTakeFirst()

  const meta = (settings?.metadata ?? {}) as Record<string, unknown>
  const rrhhEnabled = meta.rrhh_enabled === true

  if (!rrhhEnabled) {
    // OWNER/ADMIN → pantalla de activación
    // EMPLOYEE → sin acceso hasta que un admin active el módulo
    if (['OWNER', 'ADMIN'].includes(role)) {
      redirect('/rrhh/activar')
    } else {
      redirect('/login')
    }
  }

  return (
    <RrhhShell user={{ name: session.user.name ?? '', role }}>
      {children}
    </RrhhShell>
  )
}
