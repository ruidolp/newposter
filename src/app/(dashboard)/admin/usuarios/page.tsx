import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import UsuariosClient from './UsuariosClient'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  const actorRole = (session?.user as any)?.role ?? ''
  const actorId = (session?.user as any)?.id ?? ''

  return <UsuariosClient actorRole={actorRole} actorId={actorId} />
}
