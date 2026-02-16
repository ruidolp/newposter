import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/database/db'
import { getSuperadminId } from '@/lib/superadmin-auth'

// PATCH /api/superadmin/tenants/[id] — actualizar empresa
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await getSuperadminId()
    if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const existing = await db.selectFrom('tenants').select('id').where('id', '=', id).executeTakeFirst()
    if (!existing) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name?.trim()) updates.name = body.name.trim()
    if (body.plan) updates.plan = body.plan
    if (typeof body.active === 'boolean') updates.active = body.active

    const updated = await db
      .updateTable('tenants')
      .set(updates)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[superadmin/tenants/id:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar empresa' }, { status: 500 })
  }
}
