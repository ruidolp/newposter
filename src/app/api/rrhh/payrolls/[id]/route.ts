import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/database/db'
import { requireTenant } from '@/lib/tenant'

async function getAdminToken(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !['ADMIN', 'OWNER'].includes(token.role as string)) return null
  return token
}

// GET /api/rrhh/payrolls/[id] — detalle completo
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params

    const payroll = await (db as any)
      .selectFrom('rrhh_payrolls as p')
      .leftJoin('rrhh_employees as e', 'e.id', 'p.employee_id')
      .leftJoin('rrhh_contracts as c', 'c.id', 'p.contract_id')
      .selectAll('p')
      .select([
        'e.full_name as employee_name',
        'e.rut as employee_rut',
        'e.position as employee_position',
        'c.afp_institution',
        'c.health_institution',
      ])
      .where('p.id', '=', id)
      .where('p.tenant_id', '=', tenant.id)
      .executeTakeFirst()

    if (!payroll) return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 })
    return NextResponse.json(payroll)
  } catch (error) {
    console.error('[rrhh/payrolls/[id]:GET]', error)
    return NextResponse.json({ error: 'Error al obtener liquidación' }, { status: 500 })
  }
}

// PATCH /api/rrhh/payrolls/[id] — cambiar estado (issued / paid)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const { action } = body // 'issue' | 'pay'
    const updates: Record<string, unknown> = { updated_at: new Date() }

    if (action === 'issue') {
      updates.status = 'issued'
      updates.issued_at = new Date()
    } else if (action === 'pay') {
      updates.status = 'paid'
      updates.paid_at = new Date()
    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const updated = await (db as any)
      .updateTable('rrhh_payrolls')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', tenant.id)
      .returningAll()
      .executeTakeFirst()

    if (!updated) return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[rrhh/payrolls/[id]:PATCH]', error)
    return NextResponse.json({ error: 'Error al actualizar liquidación' }, { status: 500 })
  }
}
