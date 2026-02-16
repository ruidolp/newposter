import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/users/[id]/locations
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const user = await db.selectFrom('users').select('metadata').where('id', '=', id as any).executeTakeFirst()
    const meta = (user?.metadata ?? {}) as Record<string, unknown>

    return NextResponse.json({ allowed_location_ids: (meta.allowed_location_ids ?? []) as string[] })
  } catch (error) {
    console.error('[users/id/locations:GET]', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// PUT /api/users/[id]/locations
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    await requireTenant()
    const { id } = await params
    const { allowed_location_ids } = await request.json()

    const user = await db.selectFrom('users').select('metadata').where('id', '=', id as any).executeTakeFirst()
    const meta = (user?.metadata ?? {}) as Record<string, unknown>
    meta.allowed_location_ids = allowed_location_ids ?? []

    await db.updateTable('users').set({ metadata: JSON.stringify(meta) } as any).where('id', '=', id as any).execute()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[users/id/locations:PUT]', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
