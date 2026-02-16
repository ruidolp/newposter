import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redirect } from 'next/navigation'
import MiPerfilClient from './MiPerfilClient'

export default async function MiPerfilPage() {
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
