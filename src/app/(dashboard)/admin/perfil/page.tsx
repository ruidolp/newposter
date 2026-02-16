import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redirect } from 'next/navigation'
import MiPerfilClient from '@/app/rrhh/perfil/MiPerfilClient'

export default async function AdminPerfilPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user = session.user as any
  return (
    <MiPerfilClient
      name={user.name ?? ''}
      email={user.email ?? ''}
      role={user.role ?? ''}
    />
  )
}
