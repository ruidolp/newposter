import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// PATCH /api/locations/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const existing = await db
      .selectFrom('locations')
      .select(['id', 'is_default'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .executeTakeFirst()

    if (!existing) return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name?.trim()) updates.name = body.name.trim()
    if (body.type) updates.type = body.type
    if (body.active !== undefined) updates.active = body.active

    const updated = await db
      .updateTable('locations')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[locations/id:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar ubicación' }, { status: 500 })
  }
}
