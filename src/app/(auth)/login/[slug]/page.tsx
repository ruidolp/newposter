import { redirect } from 'next/navigation'
import { db } from '@/database/db'
import SlugLoginClient from './SlugLoginClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SlugLoginPage({ params }: Props) {
  const { slug } = await params

  const tenant = await db
    .selectFrom('tenants')
    .select(['id', 'name', 'slug'])
    .where('slug', '=', slug)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!tenant) {
    redirect('/login')
  }

  return <SlugLoginClient tenantId={tenant.id} tenantName={tenant.name} tenantSlug={tenant.slug} />
}
