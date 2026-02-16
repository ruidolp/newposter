import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getToken_(request: NextRequest) {
  return getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
}

// PATCH /api/rrhh/overtime/[id] — aprobar o rechazar HHEE
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken_(request)
    if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const { action } = body
    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const ot = await (db as any)
      .selectFrom('rrhh_overtime')
      .select('id', 'status')
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!ot) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    if (ot.status !== 'pending') {
      return NextResponse.json({ error: 'El registro ya fue procesado' }, { status: 409 })
    }

    const updated = await (db as any)
      .updateTable('rrhh_overtime')
      .set({
        status: action,
        approved_by_user_id: token.id,
        approved_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .returningAll()
      .executeTakeFirst()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[rrhh/overtime/[id]:PATCH]', error)
    return NextResponse.json({ error: 'Error al procesar HHEE' }, { status: 500 })
  }
}
