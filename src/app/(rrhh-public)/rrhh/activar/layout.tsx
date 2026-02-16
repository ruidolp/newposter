import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth-options'

/**
 * Layout propio para /rrhh/activar.
 * No hereda el layout de /rrhh para evitar el loop de verificación.
 * Solo requiere estar autenticado como OWNER o ADMIN.
 */
export default async function ActivarLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as string
  if (!['OWNER', 'ADMIN'].includes(role)) redirect('/admin/dashboard')

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
