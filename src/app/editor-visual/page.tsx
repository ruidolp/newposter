import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import EditorVisualClient from './EditorVisualClient'

export const metadata = { title: 'Editor Visual — posfer.com' }

export default async function EditorVisualStandalonePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as any)?.role as string
  if (!['ADMIN', 'OWNER'].includes(role)) {
    redirect('/pos')
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <EditorVisualClient />
    </main>
  )
}
