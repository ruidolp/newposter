import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import './admin.css'
import AdminShell from './AdminShell'

export const metadata = { title: 'Admin — posfer.com' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as any)?.role as string
  if (!['ADMIN', 'OWNER'].includes(role)) {
    redirect(role === 'EMPLOYEE' ? '/rrhh/dashboard' : '/pos')
  }

  return (
    <AdminShell user={{ name: session.user?.name ?? '', role }}>
      {children}
    </AdminShell>
  )
}
