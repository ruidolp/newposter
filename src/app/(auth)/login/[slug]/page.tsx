import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

// Redirige la URL antigua /login/[slug] a la nueva /[slug]/login
export default async function LegacySlugLoginRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/${slug}/login`)
}
